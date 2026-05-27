# CHƯƠNG 1: MỞ ĐẦU

## 1.1 Giới thiệu ứng dụng và Phân tích yêu cầu

### 1.1.1 Lý do thực hiện đề tài
Hiện nay, sự già hóa dân số đang trở thành một xu hướng tất yếu tại nhiều quốc gia, trong đó có Việt Nam. Người cao tuổi thường phải đối mặt với các vấn đề suy giảm sức khỏe, trí nhớ kém và nhiều bệnh lý nền cần phải theo dõi thường xuyên. 

Tuy nhiên, trong bối cảnh xã hội hiện đại, con cái và những người trẻ thường bận rộn với công việc, không có đủ thời gian để túc trực chăm sóc ông bà, cha mẹ 24/24. Điều này dẫn đến nhiều rủi ro tiềm ẩn cho người cao tuổi khi ở nhà một mình như:
- Quên uống thuốc, uống sai liều lượng hoặc sai giờ.
- Bỏ bữa, chế độ dinh dưỡng không đảm bảo.
- Xảy ra các sự cố khẩn cấp (té ngã, đột quỵ, tăng huyết áp bất ngờ) nhưng không kịp thời thông báo cho người thân.
- Cảm giác cô đơn, thiếu kết nối với con cái.

Xuất phát từ thực trạng trên, dự án **ElderCare - Ứng dụng hỗ trợ chăm sóc sức khỏe người cao tuổi** được thực hiện nhằm cung cấp một giải pháp công nghệ toàn diện. Ứng dụng đóng vai trò như một cầu nối số, giúp người giám hộ theo dõi, chăm sóc sức khỏe người thân từ xa một cách hiệu quả, đồng thời mang lại cho người cao tuổi một công cụ đơn giản để quản lý lịch trình y tế và báo động khi cần thiết.

### 1.1.2 Concept của ứng dụng (Ý tưởng chủ đạo)
**ElderCare** được thiết kế dựa trên concept "Kết nối theo thời gian thực (Real-time connection)". Hệ thống phân tách người dùng thành hai vai trò chính có sự liên kết chặt chẽ với nhau:
- **Người cao tuổi (Elderly):** Sử dụng giao diện được tối giản hóa, phông chữ lớn, tập trung vào các nút bấm kích thước to rõ. Các tính năng hướng tới sự "thụ động" và "báo cáo": tự động ghi nhận hoạt động (passive check-in), nhấn nút SOS khẩn cấp, xem và xác nhận lịch uống thuốc.
- **Người giám hộ (Caregiver):** Đóng vai trò "quản lý" và "theo dõi". Được cung cấp các luồng thông tin liên tục từ người cao tuổi: nhận cảnh báo ngay lập tức (real-time alerts), theo dõi lịch sử uống thuốc, biểu đồ sức khỏe và trao đổi tin nhắn.

Hệ thống hoạt động theo nguyên tắc: *Mọi hành động của người cao tuổi đều được cập nhật ngay lập tức đến thiết bị của người giám hộ và ngược lại*, thông qua cơ chế WebSocket và Push Notification.

### 1.1.3 Phân tích các yêu cầu đối với ứng dụng

**A. Yêu cầu chức năng (Functional Requirements)**
1. **Quản lý tài khoản & Phân quyền:** Cho phép đăng ký, đăng nhập và phân quyền rõ ràng (Người cao tuổi, Người giám hộ, Quản trị viên). Cho phép liên kết tài khoản giữa người cao tuổi và người giám hộ thông qua Email hoặc Số điện thoại.
2. **Quản lý Đơn thuốc & Lịch trình:** Người giám hộ có thể số hóa đơn thuốc, thiết lập giờ uống. Ứng dụng tự động nhắc nhở người cao tuổi và ghi nhận lịch sử (Đã uống, Bỏ qua, Bỏ lỡ).
3. **Điểm danh an toàn (Check-in):** 
   - Chủ động: Người cao tuổi tự nhấn nút điểm danh.
   - Thụ động: Hệ thống tự động ghi nhận thao tác sử dụng app của người cao tuổi. Nếu quá thời gian quy định không có dấu hiệu hoạt động, hệ thống tự động phát cảnh báo.
4. **Cảnh báo khẩn cấp (SOS):** Cho phép người cao tuổi gửi tín hiệu cấp cứu kèm vị trí định vị (GPS) đến tất cả người giám hộ chỉ với 1 thao tác.
5. **Theo dõi hồ sơ sức khỏe:** Cho phép ghi chép và theo dõi biến thiên của các chỉ số sinh tồn (huyết áp, nhịp tim, đường huyết, cân nặng) theo trục thời gian.
6. **Chat & Phân tích AI:** Tích hợp tính năng nhắn tin thời gian thực. Hỗ trợ người cao tuổi chụp ảnh bữa ăn gửi cho người giám hộ, hệ thống AI sẽ tự động phân tích và nhận diện món ăn.
7. **Quản trị hệ thống (Admin):** Cho phép quản trị viên cấu hình động các thông số của hệ thống (thời gian nhắc nhở, ngưỡng cảnh báo, giới hạn thiết bị) mà không cần can thiệp vào mã nguồn.

**B. Yêu cầu phi chức năng (Non-Functional Requirements)**
- **Tính tiện dụng (Usability):** Giao diện phải phù hợp với thị lực và khả năng thao tác của người cao tuổi. Tránh các luồng thao tác phức tạp, nhiều bước.
- **Tính thời gian thực (Real-time):** Độ trễ của tin nhắn chat và thông báo cảnh báo phải được tối thiểu hóa (dưới 1-2 giây trong điều kiện mạng ổn định).
- **Tính khả dụng (Availability):** Các cảnh báo khẩn cấp phải được gửi đi ngay cả khi ứng dụng đang chạy ngầm (background) hoặc đã đóng, đòi hỏi tích hợp Push Notification.
- **Tính linh hoạt & mở rộng:** Cấu trúc cơ sở dữ liệu và API cần được thiết kế chuẩn RESTful, dễ dàng mở rộng thêm các tính năng (như tích hợp thiết bị IoT đo nhịp tim) trong tương lai.

---

## 1.2 Phân tích, đánh giá và lựa chọn công nghệ sử dụng

Để đáp ứng các yêu cầu khắt khe về tính thời gian thực, bảo mật và trải nghiệm đa nền tảng, dự án đã đánh giá và lựa chọn stack công nghệ sau:

### 1.2.1 Phía Server (Backend)
- **Framework chính:** `Spring Boot 3` (Java 17).
  - *Đánh giá & Lý do lựa chọn:* Spring Boot là một trong những framework mạnh mẽ và ổn định nhất cho kiến trúc ứng dụng doanh nghiệp (Enterprise). Nó cung cấp sẵn bộ thư viện đồ sộ, bảo mật cao (`Spring Security`), quản lý dependencies tự động qua Maven. Đặc biệt, Spring Boot hỗ trợ cực kỳ tốt việc xây dựng RESTful APIs và có độ tương thích cao với kiến trúc Microservices nếu cần mở rộng sau này.
- **Cơ sở dữ liệu (Database):** `MySQL` kết hợp `Spring Data JPA` (Hibernate).
  - *Đánh giá & Lý do lựa chọn:* Dự án đòi hỏi quản lý cấu trúc dữ liệu có tính quan hệ chặt chẽ (Người dùng -> Đơn thuốc -> Lịch sử uống; Người dùng -> Hội thoại -> Tin nhắn). MySQL là RDBMS mã nguồn mở phổ biến, đáp ứng tốt tính toàn vẹn dữ liệu (ACID). Spring Data JPA giúp giảm thiểu việc viết các câu lệnh SQL thủ công, hỗ trợ map các Object trong Java trực tiếp xuống database.
- **Công nghệ Real-time:** `WebSocket` với giao thức `STOMP` (Simple Text Oriented Messaging Protocol).
  - *Đánh giá & Lý do lựa chọn:* Thay vì dùng kỹ thuật HTTP Long-polling gây tốn tài nguyên, WebSocket duy trì một kết nối hai chiều liên tục giữa client và server. Giao thức STOMP giúp định tuyến tin nhắn thông qua các "topic" (ví dụ: `/topic/alerts/123`), giúp Spring Boot dễ dàng push tin nhắn chat, trạng thái điểm danh hoặc cảnh báo đến đúng thiết bị một cách nhẹ nhàng và bảo mật.

### 1.2.2 Phía Mobile (Frontend)
- **Framework:** `React Native` kết hợp nền tảng `Expo` (SDK 54).
  - *Đánh giá & Lý do lựa chọn:* Phát triển ứng dụng Native (Java/Kotlin cho Android, Swift cho iOS) sẽ mất rất nhiều thời gian và nhân lực. React Native cho phép viết code một lần (JavaScript) và biên dịch chạy trên cả hai nền tảng, đảm bảo hiệu năng gần tương đương native.
  - Sự kết hợp với nền tảng **Expo** giúp bỏ qua các bước cấu hình native phức tạp. Expo cung cấp sẵn các bộ thư viện chuẩn hóa cho thiết bị di động như: `expo-location` (lấy tọa độ GPS cho SOS), `expo-notifications` (nhận push thông báo), `expo-image-picker` (chụp ảnh bữa ăn).
- **Quản lý trạng thái & Gọi API:** Sử dụng `Axios` để giao tiếp REST API và `AsyncStorage` để lưu trữ token bảo mật cục bộ.

### 1.2.3 Các dịch vụ và công nghệ tích hợp (Third-party integrations)
- **Bảo mật và Xác thực:** `JSON Web Token (JWT)` kết hợp mã hóa mật khẩu `Bcrypt`.
  - Giúp kiến trúc backend trở nên Stateless (không cần lưu session). Client lưu JWT và đính kèm vào HTTP Header trong mỗi request, nâng cao hiệu suất và dễ dàng mở rộng máy chủ.
- **Dịch vụ Push Notification:** `Firebase Cloud Messaging (FCM)` kết hợp với `Expo Push Notification Service`.
  - *Lý do:* WebSocket chỉ hoạt động khi ứng dụng đang mở (Foreground). Để gửi cảnh báo nhắc thuốc hoặc SOS khi người dùng đã tắt app, cần một dịch vụ Push Notification ở cấp độ hệ điều hành. FCM và Expo Push là lựa chọn tối ưu, miễn phí và hoạt động cực kỳ ổn định.
- **Trí tuệ nhân tạo (AI):** `Google GenAI SDK (Gemini AI)`.
  - *Lý do:* Để hỗ trợ phân tích hình ảnh bữa ăn trong khung chat, dự án tích hợp Gemini API của Google. Mô hình này có khả năng nhận diện hình ảnh (Vision) tốt, tốc độ phản hồi nhanh, hỗ trợ trả về cấu trúc JSON phù hợp cho việc bóc tách thông tin hiển thị lên giao diện.
- **Dịch vụ Bản đồ & Vị trí:** `OpenStreetMap` (thông qua `Overpass API`).
  - *Lý do:* Tích hợp tính năng tìm kiếm nhà thuốc/trạm y tế gần nhất bằng cách tính toán khoảng cách Haversine dựa trên tọa độ từ Overpass API, giúp tiết kiệm chi phí so với việc sử dụng Google Maps API đắt đỏ, nhưng vẫn đảm bảo độ chính xác cao.
