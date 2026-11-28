# fx-880BTG PLUS Emulator (Demo) — điện thoại và ngoại tuyến

Bản demo.11 giữ bộ tính, font, vị trí phím và renderer LCD của demo.10. Vỏ web tiếp nhận bố cục/tiện ích đã dùng cho dự án 580: máy vừa vùng nhìn thấy, vùng an toàn iPhone, menu trong vỏ, hướng dẫn cài, màu vỏ, phóng LCD, nhật ký, bàn phím PC, góp ý và cập nhật chủ động.

Địa chỉ hiện hành: https://fx880btgplus.netlify.app/ . Nếu đã cài từ địa chỉ Netlify dài trước đây, hãy thêm lại ứng dụng từ link mới; bộ nhớ/cài đặt được trình duyệt giữ riêng theo địa chỉ website.

## Cài và kiểm tra ngoại tuyến

- iPhone/iPad: mở bằng Safari, Chia sẻ → Thêm vào Màn hình chính. Bật mở như ứng dụng web nếu có. Mở biểu tượng 880BTG PLUS khi còn mạng.
- Android: mở bằng Chrome, chọn Cài ứng dụng trong máy hoặc menu trình duyệt → Thêm vào màn hình chính/Cài đặt.
- Windows/macOS: Chrome hoặc Edge có nút cài; Safari trên macOS hỗ trợ Thêm vào Dock.
- Mở Tiện ích hoặc hướng dẫn cài, chờ **Sẵn sàng dùng ngoại tuyến**. Sau đó tắt mạng, đóng/mở lại từ biểu tượng, thử 7×8=56 và đổi ứng dụng.
- Chỉ báo sẵn sàng do worker kiểm đủ tệp trong bộ nhớ. Không suy từ navigator.onLine hoặc việc đăng ký worker thành công.
- Cập nhật tải vào bộ nhớ riêng, kiểm SHA-256 đầy đủ và chờ người dùng bấm. Phép tính đang nhập không tự bị tải lại. Bấm cập nhật sẽ mở lại máy; cài đặt đã chọn được giữ.
- Trình duyệt/hệ điều hành có thể thu hồi dữ liệu khi thiếu chỗ. Khi đó cần mở lại khi có mạng. Kiểm trên trình duyệt không thay thế nghiệm thu cài trên iPhone/Android vật lý.

## Phạm vi dữ liệu và bảo mật

- Bộ tính chạy tại thiết bị; không theo dõi, không gửi phép tính hoặc nhật ký tự động. Chỉ giữ cài đặt/màu vỏ trong localStorage; nhật ký ở phiên đang mở.
- Góp ý/ảnh chỉ gửi cho BITEX qua Netlify khi người dùng bấm Gửi. Mất mạng không tự gửi lại, không đưa POST hoặc ảnh đính kèm vào bộ nhớ ngoại tuyến. Giới hạn ảnh PNG/JPEG/WebP 5 MB; có honeypot và giới hạn độ dài trường.
- HTTPS, CSP chỉ cho mã cùng nguồn, chặn nhúng từ trang khác, nosniff, không gửi referrer và không cho camera/micro/vị trí/thanh toán/USB. Không có khóa bí mật, hồ sơ Word/PDF/TIFF, test hoặc QA trong gói công khai.
- Không bật bridge xuất dữ liệu, miền nhúng hoặc API điều khiển từ bên ngoài. Chưa có danh sách miền BITEX được phê duyệt.
- noindex/nofollow chỉ yêu cầu công cụ tìm kiếm không lập chỉ mục; bản demo công khai vẫn mở được khi có link. JavaScript phía thiết bị luôn có thể được người dùng tải về, không coi CSP là cách giấu mã nguồn.
- Netlify có thể sửa HTML để xử lý form/nhãn nền tảng. Gói cung cấp HTML chuẩn trong JSON cùng nguồn; worker xác minh cả mã băm JSON lẫn HTML trước khi dùng làm trang ngoại tuyến. Mọi tài nguyên tính toán, ảnh, font cũng kiểm SHA-256. Chỉ thị triển khai `_headers`/`_redirects` và trang biên nhận góp ý chỉ dùng khi có mạng không nằm trong danh sách tải ngoại tuyến; giống chính sách bản 580, chúng không phải tài nguyên khởi động máy. Không nới kiểm tra để chấp nhận HTML khác bản đã chốt.

## Xây dựng và kiểm

Chạy `node --test test/*.test.js`, sau đó `python3 tools/build-preview.py`. Builder tạo gói demo và manifest kiểm tệp, chỉ chứa tài nguyên sản phẩm trong web. Giải nén phần web vào thư mục phát hành Netlify, giữ `_headers`, manifest, biểu tượng, release.json và offline-shell.json.

Dùng `BITEX_880_ROOT=<thư mục web đã đóng gói> BITEX_880_PORT=8886 node serve.js` để kiểm gói. Kiểm dọc 320×568, 390×844, ngang 844×390 và desktop, đủ 48 phím, không tràn trang hoặc va thanh tiện ích. Kiểm lần mở mới sau khi tắt server để chứng minh ngoại tuyến.

Nguồn hướng dẫn cài: [Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable). Cấu hình bảo mật: [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/).
