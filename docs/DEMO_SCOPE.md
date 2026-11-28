# Phạm vi demo fx-880BTG PLUS — 0.7.0-demo.19

Bản đóng gói ngày 28/11/2026, tiếp tục từ demo.10, kế thừa nền tính toán beta.104. Chữ CASIO được bỏ khỏi mặt máy theo yêu cầu; tên mẫu fx-880BTG PLUS, các phím, nhãn phím và LCD được giữ theo mẫu PLUS. Bốn màu lấy từ ảnh TIFF gốc. LCD dùng bộ điểm ảnh đã đối chiếu trên ClassPad, gồm chữ tiếng Việt, số và ký hiệu; gói có sẵn toàn bộ tài nguyên.

## Cách mở

Giải nén rồi mở **MO-DEMO.html** bằng Chrome hoặc Edge. Tệp có sẵn mã tính toán, hình ảnh và font, hoạt động không cần kết nối mạng. Hướng dẫn và sáu bài mẫu nằm trong **HUONG-DAN-DEMO.txt**. Có thể bấm lên phím hoặc dùng bàn phím máy tính; bảng **Phím tắt** ngay ngoài máy có hướng dẫn.

Thư mục **web/** là bản dùng cho website. Bản chạy qua máy chủ cục bộ hoặc HTTPS có tính năng lưu ngoại tuyến và cập nhật phiên bản. Dùng `node serve.js` nếu cần chạy qua máy chủ cục bộ.

## Hiển thị LCD

LCD dựng chữ, ba sắc độ điểm ảnh, chỉ báo và con trỏ trên cùng một SVG192×75. Giữ nguyên glyph và vị trí của mẫu PLUS; loại bỏ phóng canvas kiểu pixelated gây nét không đều khi co giãn. Demo.3 bổ sung HOME khi ẩn số lựa chọn cho cả 14 ứng dụng, tiếng Việt và tiếng Anh; bổ sung nhãn/tiêu đề cài đặt còn dùng font dự phòng. Phím số vẫn chọn được khi nhãn số bị ẩn, và BACK trong Cài đặt giữ đúng mục vừa chọn theo PLUS.

Demo.4 sửa ô mũ khi phím ×10ˣ đặt ở **Mũ**: bình phương, nghịch đảo, %, toán tử trong mũ, DEL và con trỏ sau hai loại lỗi tràn. Ký hiệu % nhỏ lấy từ điểm ảnh PLUS, các glyph cũ và bốn TTF giữ nguyên. Bản này đang kiểm cục bộ, chưa đẩy lên kho hoặc thay demo công khai.

Demo.5 hoàn thiện sáu màn KH k.học: giới hạn phím trong mũ, nhóm số khi EXE, bình phương ngoài số khoa học, lịch sử và lỗi số mũ ba chữ số. Mọi ca này đã đối chiếu đầy đủ điểm ảnh/chỉ báo trên đúng PLUS; ký hiệu ×10 nhỏ lấy từ LCD gốc, font cũ giữ nguyên.

Demo.6 chỉnh con trỏ cuối log có mũ khoa học và ▶ mở ô nhập trống của tham số Phân phối đang chọn. Ở mốc demo.6, ca Stack Goto dài vẫn được ghi riêng. Font và atlas giữ nguyên.

Demo.7 đã chốt Goto Stack và cuộn ngang MathI, gồm ca sinh dài. Kiểm cả đi trái/phải, DEL, biểu thức có phần đuôi khác và sửa lỗi toán tử để tính lại thành 1. Ánh xạ vị trí Stack mới giới hạn ở biểu thức số phẳng của Tính thường MathI; cây có cấu trúc/hàm mở rộng cần đối chiếu riêng.

Demo.8 bổ sung Goto vào đúng ô con của phân số, căn, Abs, log cơ số và phân số nằm trong căn; đối chiếu riêng các hàm sin, ln và sinh. Chỉnh cuộn tại ô con, nét căn/biểu thức ở mép màn hình và chiều cao con trỏ sau log cơ số. Log cơ số giữ đối số đầu trên ngăn xếp trong khi tính đối số sau. Font và bộ ký tự giữ nguyên. 42 ca mới đã khớp toàn LCD/chỉ báo trên PLUS.

Demo.9 chốt giới hạn toán tử khi hàm một đối số đang chờ, khôi phục năm màn dấu âm trong căn của demo.8 và kiểm luồng sửa lỗi đến kết quả1. Goto vào số mũ, kể cả căn/phân số nằm trong số mũ, đã khớp các mẫu PLUS đã đo. Có31 ca mới đạt. Nhánh ngăn xếp/Goto của căn bậc n được giữ riêng vì thứ tự đánh giá chỉ số/đối số hiện còn khác PLUS.

Demo.10 xử lý tuần tự bốn lỗi trong phiếu BITEX ngày 24/11: phân số gom biến và bình phương vào tử số; Số phức nhận căn của số thực âm và giữ kết quả căn chính xác; CATALOG > Khác có PreAns ở vị trí 2 trong màn tính thường; xác nhận lại ngoặc của Sci Notat đã sửa ở demo.5. Có 84 quan sát mới đầy đủ LCD/chỉ báo trên đúng PLUS, gồm các ca trong phiếu và ca lân cận. Bốn font giữ nguyên; chỉ bổ sung nhãn PreAns và số tắt × lấy từ điểm ảnh gốc.

Demo.11 bổ sung vỏ ứng dụng cho điện thoại/web theo bản 580: tự vừa màn hình và vùng an toàn, menu Tiện ích trong vỏ, bốn màu, phóng LCD, nhật ký, hướng dẫn cài iPhone/Android/máy tính và góp ý chủ động. Bản Netlify có manifest/biểu tượng để cài như ứng dụng. Dữ liệu ngoại tuyến được kiểm đủ tệp và SHA-256, cập nhật chờ người dùng. Có CSP, chặn nhúng và quyền nhạy cảm. Bộ tính, controller, glyph và font giữ nguyên demo.10. Kiểm viewport trong trình duyệt; cài/mở lại trên iPhone/Android vật lý cần người dùng nghiệm thu riêng.

Demo.12 tối ưu kích thước máy trên điện thoại sau ảnh phản hồi của người dùng: khung nhãn hosting bị cắt hoàn toàn không còn chiếm chỗ. Chỉ tránh nhãn khi nhãn thực sự hiển thị và có thể che vùng phím; dùng khoảng trống phía trên trước khi thu nhỏ. Ở viewport430×744 tái hiện ảnh phản hồi, máy tăng từ308,66 lên353,58px chiều rộng, lớn hơn khoảng14,6%, giữ đúng tỷ lệ506:1059. Kiểm trình duyệt320×568,390×844,430×744,430×932,844×390 và1280×900: đủ48phím, không tràn. Đây là kiểm bố cục web, không phải quan sát LCD mới trên máy PLUS. Bộ tính, LCD, bốn font và bốn mặt máy giữ nguyên.

Demo.13 đưa Nhật ký phím thành bảng phụ giống bản 580 công khai 2026.11.23-qa.1: nằm dưới máy trên điện thoại và bên cạnh máy trên màn rộng, vẫn bấm máy được khi mở. Có đếm và làm nổi phím cuối, Sao chép, Tải ảnh PNG, Tải JSON, Xóa và đóng/mở lại. Xóa chỉ xóa nhật ký, không đổi phép tính. Giữ 500 phím gần nhất, ghi số bước bị lược trong JSON/PNG; ảnh chứa toàn bộ chuỗi được giữ, kể cả phần đang nằm ngoài vùng cuộn. Nhật ký và xuất tệp xử lý trên thiết bị, dùng được ngoại tuyến. Đây là tiện ích ứng dụng kế thừa 580, không phải tính năng hoặc quan sát LCD mới của máy PLUS. Bộ tính, LCD/atlas, font và mặt máy giữ nguyên demo.12.

Demo.14 sửa ba lỗi trong phiếu BITEX ngày 25/11: giữ f/g khi chuyển qua Đường thẳng số hoặc Bảng tính; nhấn SETTINGS trong các mức Cài đặt giữ nguyên màn hình; CATALOG chọn bằng phím số rồi Back giữ đúng mục cha và vị trí cuộn. Có 47 màn quan sát mới trên đúng PLUS, gồm tiếng Việt/Anh và menu nhiều cấp. Đổi thật sự giữa kiểu nhập MathI và LineI trong Cài đặt vẫn xóa f/g theo PLUS; chuyển MathI/MathO sang MathI/DecimalO giữ f/g. Font, bộ ký tự, bộ dựng LCD, ảnh mặt máy và tiện ích điện thoại/ngoại tuyến giữ nguyên demo.13. Bản này hoàn thiện cục bộ, chưa cập nhật website.

Demo.15 xử lý tám lỗi mới trong phiếu BITEX25/11 lần2 và kiểm lại ba lỗi cũ đã sửa ở demo.14. Tích phân nhận ▶ từ hai cận về ô hàm, giữ đúng chiều cao con trỏ; SHIFT+CATALOG nhận ↑/↓ đổi trang; Solver có nhánh dấu =; TOOLS của Phương trình có nghiệm phức và Verify đúng phạm vi PLUS (hệ2ẩn và bậc2). Verify nhận nghiệm thực/phức, phân số chính xác và cực trị, phân biệt đáp án sai dù chỉ lệch10⁻¹³. Màn Tương phản, Complex Result, phím ×10ˣ và FORMAT dùng đúng điểm ảnh/tiêu đề Việt/Anh. Ran#/RanInt# có glyph # gốc và giữ chỉ báo LCD. ⏫/⏬ trong Hình học chọn đầu/cuối danh sách tham số; giữ ô đang nhập dở. Có120màn đối chiếu mới, đủ LCD và chỉ báo. Bốn TTF và mọi glyph cũ giữ nguyên; chỉ bổ sung tài nguyên quan sát từ PLUS. Bản này chốt cục bộ, website chưa cập nhật.

Demo.16 sửa ký hiệu Nhật ký phím theo bản 580 công khai: phím mũ hiện x□, phân số hiện □□, log cơ số hiện log▫, điều hướng dùng ▲/◀/▶/▼ và quay lại dùng ↩. Màn nhật ký, Sao chép, PNG và JSON dùng cùng ký hiệu; SHIFT vẫn được ghi thành bước phím riêng. Mô tả nút cho trình đọc màn hình được giữ nguyên. Có đối chiếu trực tiếp với bản 580 ngày 26/11 và kiểm luồng xuất tệp. Bộ tính, LCD, font và mặt máy giữ nguyên demo.15. Chỉ hoàn thiện cục bộ.

Demo.17 thêm **Sao chép Word** theo keymap ClassWiz CW01 Ver.1.00 của CASIO do chủ dự án cung cấp. Đủ 48 phím; giữ đúng chữ hoa/thường và dấu câu, không thêm ngoặc hoặc dấu cách. Dán vào Word, chọn phần mã vừa dán và đổi sang font **CASIO ClassWiz CW01** đã cài trên máy. Ví dụ chuỗi 2, mũ, 3, EXE cho mã `2^3B`. SHIFT vẫn là một bước phím riêng. Bảng nhật ký/PNG/JSON giữ ký hiệu dễ đọc; **Sao chép ký hiệu** giữ cách chép văn bản cũ. Đã thử sao chép và dán trên Chrome rồi hiển thị bằng TTF gốc; chưa thử trực tiếp trong Microsoft Word. Bản thử cục bộ, Netlify vẫn demo.16.

Demo.18 hiển thị cả 48 phím trong nhật ký bằng đường nét gốc của font CASIO đã cung cấp, gồm ô vuông lớn và ô nhỏ trên cao của phím mũ, phân số xếp dọc, căn, log cơ số và các phím điều hướng. Bảng nhật ký và ảnh PNG dùng chung hình phím, không phụ thuộc font đã cài trên thiết bị. Sao chép Word giữ nguyên mã theo keymap; Sao chép ký hiệu và JSON giữ nhãn văn bản để tương thích. Các hình phím là tài nguyên của tiện ích biên soạn, không thay font hoặc hiển thị LCD. Bản này chốt cục bộ để xem trước khi cập nhật website.

Demo.19 tích hợp cổng trao đổi dữ liệu theo patch chủ dự án cung cấp: xuất biểu thức/kết quả và dữ liệu Tính thường, Bảng giá trị, Thống kê, Phương trình, Bất phương trình; xuất cây lỗi và tô sáng phím hướng dẫn. Cổng mặc định tắt, chỉ hoạt động trong iframe khi có origin được cấu hình chính xác. Bản phát hành này không bật website bên ngoài và giữ chính sách chống nhúng hiện hành. Có14 kiểm cổng mới; không bổ sung quan sát LCD PLUS. Bộ kiểm tổng bao gồm6kiểm adapter hosting BITEX riêng, không có nghĩa bản Netlify được bổ sung theo dõi GTM. [Giao thức và giới hạn](CONG-TRAO-DOI-DU-LIEU.md).

## Chức năng chính

| Nhóm | Phạm vi có trong demo |
| --- | --- |
| Tính thường | MathI/LineI, phân số, căn, mũ, log, lượng giác, giải tích, lịch sử, FORMAT, biến nhớ, CALC, f/g và Verify |
| Phương trình và bất phương trình | Hệ 2–4 ẩn, đa thức/bất phương trình bậc 2–4, nghiệm thực/phức và SOLVE |
| Thống kê và phân phối | Một/hai biến, tần số, hồi quy; bảy dạng phân phối chuẩn, nhị thức và Poisson |
| Bảng giá trị và bảng tính | f/g, phạm vi, chỉnh bảng; hằng/công thức, tham chiếu, điền, sao chép/cắt và tính lại |
| Ma trận, vectơ, số phức | Nhập/sửa, phép tính, MatAns/VctAns; dạng chữ nhật/cực và các hàm phức |
| Base-N và tỉ lệ thức | Dec/Hex/Bin/Oct, phép logic, tiền tố; hai dạng tỉ lệ |
| Khám phá Toán | Bayes, xác suất độc lập/toàn phần, thống kê ghép nhóm và hình học |
| Hộp Toán học | Xúc xắc, đồng xu, Đường thẳng số và Đường tròn |
| Cài đặt | Việt/Anh, MathI/LineI, Độ/Radian/Grad, Fix/Sci/Norm, Reset |

## Mức kiểm và giới hạn

Bộ kiểm hiện có **7.265 ca đạt**, gồm **7.155 màn LCD** qua thao tác phím với kỳ vọng quan sát từ đúng fx-880BTG PLUS trên ClassPad. Demo.3 có 54 quan sát HOME/Cài đặt; demo.4 thêm 28 ca mới và khôi phục 6 ca mũ/thoát lỗi; demo.5 khôi phục sáu màn KH k.học và thêm 25 ca kiểm lân cận. Sáu phép đo lặp để xác nhận không được đếm hai lần. Demo.6 thêm 36 ca mới và khôi phục bốn ca MathI/Phân phối, cũng không tính lặp các phép đo xác nhận. Demo.7 thêm 26 ca mới và khôi phục hai ca Goto/cuộn dài; năm phép đo lại không được tính lặp. Demo.8 thêm 42 ca mới; 9 khung của ba nhánh còn chờ được giữ riêng, không tính đạt. Demo.9 thêm31 ca mới và khôi phục5 ca dấu âm; năm phép đo lặp không tính thêm. Năm mẫu căn bậc n mới còn chờ không tính đạt. Demo.10 thêm 84 màn kiểm qua phím; cả bốn lỗi trong phiếu BITEX được chốt riêng bằng đối chiếu máy PLUS và kiểm giao diện. Số ca kiểm không phải tỷ lệ hoàn thành toàn bộ máy.

Các ca còn chờ gồm ngoặc chưa đóng hoặc thoát ô mẫu số dài, ngăn xếp/Goto của căn bậc n, một số mũ lồng sâu và con trỏ sau lỗi, chữ số sâu của log/SOLVE, hệ gần suy biến, vài nhánh nhập Phân phối, giới hạn tổng/tích rất dài và chuỗi ngẫu nhiên Cùng Kết quả. QR chưa triển khai. Cần lượt nghiệm thu riêng trên máy tính vật lý và thiết bị cảm ứng thật. Các ca chưa khớp không được tính là đã đối chiếu đạt.

Khi góp ý, gửi mã bản trong Nhật ký phím cùng chuỗi thao tác. Bản demo không gửi dữ liệu tính toán ra máy chủ.
