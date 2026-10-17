const labels: Record<string, [string, string, string, string]> = {
  ko: ['가격 별도 문의', '가격 문의하기', '최신 공급가는 문의 후 안내해 드립니다.', '희망 수량'],
  en: ['Price on request', 'Request a price', 'Contact us for the latest wholesale price.', 'Desired quantity'],
  ja: ['価格はお問い合わせください', '価格を問い合わせる', '最新の卸価格はお問い合わせ後にご案内します。', '希望数量'],
  zh: ['价格请咨询', '咨询价格', '请联系我们获取最新批发价格。', '所需数量'],
  vi: ['Liên hệ báo giá', 'Yêu cầu báo giá', 'Liên hệ để nhận giá bán buôn mới nhất.', 'Số lượng mong muốn'],
  id: ['Harga berdasarkan permintaan', 'Minta harga', 'Hubungi kami untuk harga grosir terbaru.', 'Jumlah yang diinginkan'],
  th: ['สอบถามราคา', 'ขอราคา', 'ติดต่อเราเพื่อรับราคาขายส่งล่าสุด', 'จำนวนที่ต้องการ'],
  ru: ['Цена по запросу', 'Запросить цену', 'Свяжитесь с нами для уточнения актуальной оптовой цены.', 'Желаемое количество'],
  kk: ['Баға сұрау бойынша', 'Бағаны сұрау', 'Ағымдағы көтерме бағаны білу үшін бізге хабарласыңыз.', 'Қажетті саны'],
  uz: ["Narx so‘rov bo‘yicha", 'Narxni so‘rash', 'Eng so‘nggi ulgurji narx uchun biz bilan bog‘laning.', 'Kerakli miqdor'],
  ky: ['Баасы суроо боюнча', 'Баасын суроо', 'Учурдагы дүң бааны билүү үчүн бизге кайрылыңыз.', 'Керектүү саны'],
  tg: ['Нарх бо дархост', 'Дархости нарх', 'Барои нархи ҷории яклухт бо мо тамос гиред.', 'Миқдори дилхоҳ'],
  tk: ['Bahasy talap boýunça', 'Baha soraň', 'Häzirki lomaý baha üçin bize ýüz tutuň.', 'Gerekli mukdar'],
};
export function priceRequestCopy(locale: string) {
  const [label, action, hint, quantity] = labels[locale] ?? labels.en;
  return { label, action, hint, quantity };
}
