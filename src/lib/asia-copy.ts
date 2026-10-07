/** Shared copy for the new Southeast Asian locales, including non-next-intl forms. */
const localeIndex: Record<string, number> = { vi: 0, id: 1, th: 2 };
const phrases = {
  quoteRequest: ["Yêu cầu báo giá trong khi chờ xác minh", "Minta penawaran selama verifikasi tertunda", "ขอใบเสนอราคาระหว่างรอการตรวจสอบ"],
  businessNumber: ["Số đăng ký doanh nghiệp tại quốc gia của bạn", "Nomor registrasi usaha di negara Anda", "เลขทะเบียนธุรกิจในประเทศของคุณ"],
  businessNumberError: ["Nhập mã đăng ký doanh nghiệp hợp lệ.", "Masukkan nomor registrasi usaha yang valid.", "โปรดกรอกเลขทะเบียนธุรกิจที่ถูกต้อง"],
  title: ["Thông báo của tôi", "Notifikasi saya", "การแจ้งเตือนของฉัน"],
  intro: ["Xem thông báo về xác minh doanh nghiệp, đơn hàng và yêu cầu báo giá.", "Lihat pemberitahuan tentang verifikasi usaha, pesanan, dan permintaan penawaran.", "ดูการแจ้งเตือนเกี่ยวกับการยืนยันธุรกิจ คำสั่งซื้อ และคำขอใบเสนอราคา"],
  all: ["Đánh dấu tất cả là đã đọc", "Tandai semua sebagai telah dibaca", "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว"],
  empty: ["Chưa có thông báo.", "Belum ada notifikasi.", "ยังไม่มีการแจ้งเตือน"],
  error: ["Không tải được thông báo.", "Gagal memuat notifikasi.", "โหลดการแจ้งเตือนไม่ได้"],
  retry: ["Thử lại", "Coba lagi", "ลองอีกครั้ง"],
  action: ["Mở trang liên quan", "Buka halaman terkait", "เปิดหน้าที่เกี่ยวข้อง"],
  account: ["Tài khoản của tôi", "Akun saya", "บัญชีของฉัน"],
  loading: ["Đang tải thông báo…", "Memuat notifikasi…", "กำลังโหลดการแจ้งเตือน…"],
  read: ["Đã đọc", "Dibaca", "อ่านแล้ว"],
  unread: ["Mới", "Baru", "ใหม่"],
  viewAll: ["Xem tất cả thông báo", "Lihat semua notifikasi", "ดูการแจ้งเตือนทั้งหมด"],
  businessRequired: ["Cần chứng từ doanh nghiệp để xem giá", "Bukti usaha diperlukan untuk melihat harga", "ต้องมีหลักฐานธุรกิจเพื่อดูราคา"],
  businessRequiredBody: ["Vui lòng gửi giấy đăng ký doanh nghiệp, giấy phép kinh doanh hoặc chứng từ hoạt động kinh doanh trong tài khoản. Giá bán sỉ và tải hóa đơn chỉ khả dụng sau khi quản trị viên duyệt. Trong thời gian chờ duyệt, bạn vẫn có thể đăng nhập, thêm sản phẩm và gửi yêu cầu báo giá; giá chưa được hiển thị. Vui lòng che thông tin cá nhân nhạy cảm không cần thiết.", "Silakan unggah dokumen registrasi, izin usaha, atau bukti kegiatan usaha melalui akun Anda. Harga grosir dan unduhan faktur tersedia setelah persetujuan admin. Selama menunggu, Anda tetap dapat masuk, menambahkan produk, dan mengajukan permintaan penawaran; harga belum ditampilkan. Tutupi data pribadi sensitif yang tidak diperlukan.", "โปรดส่งเอกสารทะเบียนธุรกิจ ใบอนุญาต หรือหลักฐานการประกอบธุรกิจในบัญชี ราคาขายส่งและการดาวน์โหลดใบแจ้งหนี้จะใช้งานได้หลังผู้ดูแลระบบอนุมัติ ระหว่างรอยังเข้าสู่ระบบ เพิ่มสินค้า และส่งคำขอใบเสนอราคาได้ แต่ราคาจะยังไม่แสดง โปรดปิดบังข้อมูลส่วนบุคคลที่ละเอียดอ่อนและไม่จำเป็น"],
  approved: ["Doanh nghiệp được duyệt · Có thể xem giá", "Usaha disetujui · Harga tersedia", "บัญชีธุรกิจได้รับอนุมัติแล้ว · ดูราคาได้"],
  approvedBody: ["Bạn có thể xem giá cung ứng, báo giá có giá và hóa đơn.", "Anda dapat melihat harga, penawaran dengan harga dan faktur.", "คุณดูราคา ใบเสนอราคาที่มีราคา และใบแจ้งหนี้ได้"],
  review: ["Đã nhận chứng từ · Chờ xem xét", "Bukti diterima · Menunggu tinjauan", "รับหลักฐานแล้ว · รอตรวจสอบ"],
  reviewBody: ["Chứng từ đang chờ quản trị viên xem xét. Giá hiển thị sau khi được duyệt. Bạn vẫn có thể thêm sản phẩm và yêu cầu báo giá trong thời gian chờ.", "Dokumen menunggu tinjauan admin. Harga tersedia setelah persetujuan. Selama menunggu, Anda tetap dapat menambahkan produk dan meminta penawaran.", "เอกสารอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบ ราคาจะแสดงหลังได้รับอนุมัติ ระหว่างรอยังเพิ่มสินค้าและขอใบเสนอราคาได้"],
  quoteRead: ["Yêu cầu báo giá đã được xem", "Permintaan penawaran telah dilihat", "อ่านคำขอใบเสนอราคาแล้ว"],
  quoteReadBody: ["Đội ngũ đã mở yêu cầu của bạn. Xem chi tiết ở trang liên quan.", "Tim telah membuka permintaan Anda. Lihat rincian di halaman terkait.", "ทีมงานเปิดคำขอแล้ว ดูรายละเอียดในหน้าที่เกี่ยวข้อง"],
  order: ["Cập nhật đơn hàng / báo giá", "Pembaruan pesanan / penawaran", "อัปเดตคำสั่งซื้อ / ใบเสนอราคา"],
  orderBody: ["Xem số yêu cầu và trạng thái xử lý trên trang liên quan.", "Periksa nomor permintaan dan status di halaman terkait.", "ดูเลขคำขอและสถานะในหน้าที่เกี่ยวข้อง"],
} as const;

export function asianCopy(locale: string) {
  const index = localeIndex[locale];
  if (index === undefined) return null;
  return Object.fromEntries(Object.entries(phrases).map(([key, values]) => [key, values[index]])) as Record<keyof typeof phrases, string>;
}

const business = {
 title: ["Xác minh doanh nghiệp", "Verifikasi usaha", "ยืนยันธุรกิจ"],
 help: phrases.businessRequiredBody,
 file: ["Chứng từ doanh nghiệp", "Dokumen usaha", "เอกสารธุรกิจ"],
 website: ["Website công ty (không bắt buộc)", "Situs perusahaan (opsional)", "เว็บไซต์บริษัท (ไม่บังคับ)"],
 consent: ["Tôi gửi chứng từ để xác minh và đồng ý đội ngũ quản lý thành viên được ủy quyền xem xét.", "Saya mengirim bukti untuk verifikasi dan menyetujui tinjauan tim pengelola anggota yang berwenang.", "ฉันส่งหลักฐานเพื่อยืนยันธุรกิจและยินยอมให้ทีมจัดการสมาชิกที่ได้รับอนุญาตตรวจสอบ"],
 upload: ["Gửi chứng từ", "Kirim dokumen", "ส่งเอกสาร"],
 pending: ["Đang tải lên…", "Mengunggah…", "กำลังอัปโหลด…"],
 saved: ["Đã nhận chứng từ. Cần quản trị viên duyệt.", "Dokumen diterima. Persetujuan admin diperlukan.", "ได้รับเอกสารแล้ว ต้องรอผู้ดูแลอนุมัติ"],
 error: ["Tải lên thất bại. Dùng PDF, JPG hoặc PNG và thử lại.", "Unggah gagal. Gunakan PDF, JPG atau PNG dan coba lagi.", "อัปโหลดไม่สำเร็จ ใช้ PDF, JPG หรือ PNG แล้วลองอีกครั้ง"],
 view: ["Xem chứng từ đã gửi", "Lihat dokumen terkirim", "ดูเอกสารที่ส่ง"],
 none: ["Chưa gửi chứng từ.", "Belum ada dokumen.", "ยังไม่ได้ส่งเอกสาร"],
 format: ["PDF · JPG · PNG", "PDF · JPG · PNG", "PDF · JPG · PNG"],
} as const;
export function asianBusinessCopy(locale: string) {
 const index = localeIndex[locale];
 if (index === undefined) return null;
 return Object.fromEntries(Object.entries(business).map(([key, values]) => [key, values[index]])) as Record<keyof typeof business, string>;
}

const support = {
 title: ["Liên hệ hỗ trợ khách hàng", "Hubungi layanan pelanggan", "ติดต่อบริการลูกค้า"],
 intro: ["Gửi câu hỏi về tài khoản, sản phẩm hoặc báo giá. Chúng tôi sẽ phản hồi qua email bạn cung cấp.", "Kirim pertanyaan tentang akun, produk, atau penawaran. Tim kami akan membalas melalui email yang Anda cantumkan.", "สอบถามเกี่ยวกับบัญชี สินค้า หรือใบเสนอราคา ทีมงานจะตอบกลับทางอีเมลที่คุณระบุ"],
 name: ["Họ tên", "Nama", "ชื่อ"], email: ["Email nhận phản hồi", "Email balasan", "อีเมลรับคำตอบ"],
 category: ["Loại yêu cầu", "Jenis pertanyaan", "ประเภทคำถาม"], subject: ["Tiêu đề", "Subjek", "หัวข้อ"], message: ["Nội dung", "Pesan", "ข้อความ"],
 order: ["Số đơn / báo giá (không bắt buộc)", "Nomor pesanan / penawaran (opsional)", "เลขคำสั่งซื้อ / ใบเสนอราคา (ไม่บังคับ)"],
 consent: ["Tôi đồng ý cho thu thập và sử dụng tên, email và nội dung để xử lý yêu cầu.", "Saya menyetujui pengumpulan dan penggunaan nama, email, dan pesan untuk menangani pertanyaan ini.", "ฉันยินยอมให้เก็บรวบรวมและใช้ชื่อ อีเมล และข้อความเพื่อดำเนินการตอบคำถามนี้"],
 privacy: ["Chính sách bảo mật", "Kebijakan privasi", "นโยบายความเป็นส่วนตัว"],
 submit: ["Gửi yêu cầu", "Kirim pertanyaan", "ส่งคำถาม"], sending: ["Đang gửi…", "Mengirim…", "กำลังส่ง…"],
 success: ["Đã nhận yêu cầu. Lưu số tham chiếu; chúng tôi sẽ phản hồi qua email.", "Pertanyaan diterima. Simpan nomor referensi; kami membalas melalui email.", "ได้รับคำถามแล้ว เก็บเลขอ้างอิง เราจะตอบทางอีเมล"],
 reference: ["Số tham chiếu", "Nomor referensi", "เลขอ้างอิง"],
 failed: ["Không gửi được. Nội dung được giữ lại; thử lại sau.", "Gagal mengirim. Teks tetap tersimpan; coba lagi nanti.", "ส่งไม่สำเร็จ ข้อความยังอยู่ โปรดลองภายหลัง"],
 limited: ["Bạn gửi nhiều yêu cầu gần đây. Thử lại sau 5 phút.", "Terlalu banyak pertanyaan. Coba lagi dalam 5 menit.", "ส่งคำถามหลายครั้ง โปรดลองในอีก 5 นาที"],
 general: ["Câu hỏi chung", "Pertanyaan umum", "คำถามทั่วไป"], account: ["Tài khoản", "Akun", "บัญชี"], quotation: ["Đơn hàng / báo giá", "Pesanan / penawaran", "คำสั่งซื้อ / ใบเสนอราคา"], product: ["Sản phẩm", "Produk", "สินค้า"], other: ["Khác", "Lainnya", "อื่นๆ"],
 cta: ["Liên hệ hỗ trợ", "Hubungi layanan pelanggan", "ติดต่อบริการลูกค้า"], resolved: ["Đã xử lý", "Selesai", "ดำเนินการแล้ว"],
} as const;
export function asianSupportCopy(locale: string) {
 const index = localeIndex[locale];
 if (index === undefined) return null;
 return Object.fromEntries(Object.entries(support).map(([key, values]) => [key, values[index]])) as Record<keyof typeof support, string>;
}
