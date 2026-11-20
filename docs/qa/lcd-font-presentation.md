# Kiểm nétLCD —demo.2,20/11/2026

Nguồn tham chiếu:đúngfx-880BTG PLUS đang mở trênClassPad,quan sátDOM hiển thịLCD:SVG viewBox192×63,shape-rendering:auto,image-rendering:auto. Không đọc trạng thái hay thuật toán ẩn.

Chẩn đoán:canvas demo.1 phóng192×75→250.9375×98.015625CSSpx trênChromeDPR1. Pixelated làm nét cùng loại có độ rộng1 hoặc2 điểm,khác cách ClassPad dựngSVG. Giữ tệp font đúng không đủ bảo đảm hiển thị đều nét.

Sửa:giữ toàn bộ atlas/TTF và frame.pixels;SVG dùng một compound path mỗi sắc độ,tránh khe nối giữa các ô. Chỉ báoSVG gốc và con trỏ cùng viewBox192×75;giữfractional indicator coordinates vàblink1200ms.

6.689/6.689 kiểm tra qua.5 kiểm mới bảo toàn hình học toàn ô,26 mẫu native MathI+cursors và13SVG chỉ báo. Xem HOME Việt/phân số ở320×568,390×844 vàdesktop. Link thật đã thấydemo.2,tagSVG,shapegeometricPrecision,5/6 và1+2√2. Ảnh sau chụp link công khai,đã xem lại. Không đánh đồng với nghiệm thu mọi fallback/thiết bị.
