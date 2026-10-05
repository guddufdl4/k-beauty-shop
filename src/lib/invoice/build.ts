import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { CartView } from "@/lib/cart";

export type InvoiceInput = {
  cart: CartView;
  company: string;
  contact: string;
  email: string;
  country: string;
  rate: number;
  retailPrices: Record<string, number | null>;
  generatedAt: string;
};

const notes = [
  "Draft pro forma invoice based on the current quote list. Subject to availability and final confirmation.",
  "Minimum order amount: USD 500. Shipping is excluded and charged separately on the final invoice.",
  "Shipping is calculated after products and quantities are confirmed, based on weight and volume.",
  "Brand minimum order amounts and price changes may apply. Amounts exclude VAT.",
];
const roundUsd = (krw: number, rate: number) => Math.round(krw / rate * 100) / 100;

export function buildInvoiceExcel(input: InvoiceInput): Buffer {
  const rows: (string | number)[][] = [
    ["HMT KOREA - PRO FORMA INVOICE (DRAFT)"],
    ["Generated (UTC)", input.generatedAt],
    ["Company", input.company], ["Contact", input.contact], ["Email", input.email],
    ["Country", input.country], ["Exchange rate (KRW per USD)", input.rate], [],
    ["No.", "Product code", "Barcode / SKU", "Brand", "Product", "MOQ", "Quantity", "Retail KRW", "Supply KRW", "Supply USD", "Amount KRW", "Amount USD"],
  ];
  for (const [index, item] of input.cart.items.entries()) {
    rows.push([index + 1, item.productCode ?? "", item.barcode ?? item.sku, item.brand, item.name, item.moq, item.quantity,
      input.retailPrices[item.productId] ?? "", item.unitPrice, roundUsd(item.unitPrice, input.rate), item.lineTotal, roundUsd(item.lineTotal, input.rate)]);
  }
  const first = 10, last = 9 + input.cart.items.length;
  rows.push(["Subtotal (shipping and VAT excluded)", "", "", "", "", "", "", "", "", "", input.cart.subtotal, roundUsd(input.cart.subtotal, input.rate)]);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  input.cart.items.forEach((item, index) => {
    const row = first + index;
    sheet[`J${row}`] = { t: "n", f: `ROUND(I${row}/$B$7,2)`, v: roundUsd(item.unitPrice, input.rate), z: "0.00" };
    sheet[`K${row}`] = { t: "n", f: `G${row}*I${row}`, v: item.lineTotal, z: "#,##0" };
    sheet[`L${row}`] = { t: "n", f: `ROUND(K${row}/$B$7,2)`, v: roundUsd(item.lineTotal, input.rate), z: "0.00" };
  });
  sheet[`K${last + 1}`] = { t: "n", f: `SUM(K${first}:K${last})`, v: input.cart.subtotal, z: "#,##0" };
  sheet[`L${last + 1}`] = { t: "n", f: `ROUND(K${last + 1}/$B$7,2)`, v: roundUsd(input.cart.subtotal, input.rate), z: "0.00" };
  sheet["!cols"] = [7,20,21,20,55,9,12,15,15,15,18,18].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A9:L${last}` };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Pro Forma Invoice");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notes.map((note) => [note])), "Trade Notes");
  wb.Sheets["Trade Notes"]["!cols"] = [{ wch: 125 }];
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function buildInvoicePdf(input: InvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await readFile(path.join(process.cwd(), "src/assets/fonts/NotoSansKR-Regular.ttf")), { subset: false });
  const latinFont = await doc.embedFont(StandardFonts.Helvetica);
  const chooseFont = (value: string) => /[^\x20-\x7E]/.test(value) ? font : latinFont;
  doc.setTitle("HMT KOREA - Pro Forma Invoice (Draft)");
  let page = doc.addPage([842, 595]);
  let y = 558;
  const wrap = (text: string, width: number, size: number) => {
    const lines: string[] = []; let line = "";
    for (const char of text.replace(/[\r\n\t]/g, " ")) {
      if (line && chooseFont(text).widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; }
      line += char;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };
  const text = (value: string, x: number, at: number, size = 9) => page.drawText(value, { x, y: at, size, font: chooseFont(value), color: rgb(.12,.15,.2) });
  const headers = ["No.", "Product / Code / MOQ", "Qty", "Retail KRW", "Supply KRW", "Supply USD", "Amount KRW", "Amount USD"];
  const widths = [27,265,35,83,83,78,105,102];
  const tableHeader = () => {
    page.drawRectangle({ x:32,y:y-7,width:778,height:24,color:rgb(.93,.93,.98) });
    let x=36; headers.forEach((h,i)=>{text(h,x,y,8);x+=widths[i]}); y-=31;
  };
  text("HMT KOREA - PRO FORMA INVOICE (DRAFT)",32,y,17); y-=27;
  for (const line of wrap(`Buyer: ${input.company} | ${input.contact} | ${input.email} | ${input.country}`,770,9)) { text(line,32,y); y-=14; }
  text(`Generated: ${input.generatedAt} UTC | Exchange rate: 1 USD = ${input.rate.toLocaleString('en-US')} KRW`,32,y,8); y-=26;
  tableHeader();
  for (const [index,item] of input.cart.items.entries()) {
    const lines = [...wrap(`${item.brand} - ${item.name}`,253,8),...wrap(`${item.productCode ?? item.sku} | Barcode: ${item.barcode ?? "-"} | MOQ: ${item.moq}`,253,7)];
    const height=Math.max(33,lines.length*12+10);
    if(y-height<65){page=doc.addPage([842,595]);y=558;text("HMT KOREA - PRO FORMA INVOICE (continued)",32,y,13);y-=28;tableHeader()}
    const retail=input.retailPrices[item.productId];
    const values=[String(index+1),"",String(item.quantity),retail!=null?retail.toLocaleString('en-US'):"-",item.unitPrice.toLocaleString('en-US'),roundUsd(item.unitPrice,input.rate).toFixed(2),item.lineTotal.toLocaleString('en-US'),roundUsd(item.lineTotal,input.rate).toFixed(2)];
    let x=36;values.forEach((v,i)=>{if(i===1)lines.forEach((l,n)=>text(l,x,y-n*12,8));else text(v,x,y,8);x+=widths[i]});
    y-=height;page.drawLine({start:{x:32,y:y+13},end:{x:810,y:y+13},thickness:.5,color:rgb(.85,.87,.9)});
  }
  if(y<160){page=doc.addPage([842,595]);y=558;}
  y-=15;text(`SUBTOTAL: KRW ${input.cart.subtotal.toLocaleString('en-US')} / USD ${roundUsd(input.cart.subtotal,input.rate).toFixed(2)}`,32,y,13);y-=22;
  for(const note of notes){for(const line of wrap(note,770,8)){text(line,32,y,8);y-=12;}y-=4;}
  doc.getPages().forEach((p,i)=>p.drawText(`Page ${i+1} / ${doc.getPageCount()}`,{x:740,y:23,size:8,font:latinFont}));
  return doc.save();
}
