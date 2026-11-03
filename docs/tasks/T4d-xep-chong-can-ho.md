# T4d · Hộp xếp chồng kiểu căn hộ, không khoảng cách giữa các tầng

Người dùng phản hồi sau khi xem `/thiet-ke`: **các hộp xếp chồng trực tiếp lên nhau để tiết kiệm không gian, không có khoảng cách giữa hai tầng kệ.** Đề bài T4 giả định sai là kệ có tầng cách nhau, nên phải sửa lại. Ràng buộc của T4 vẫn giữ nguyên: chữ hiển thị tiếng Việt, không chép code iRAS hay waterkit, không commit, dùng `npx.cmd`/`npm.cmd`, chạy `npm.cmd run format`, không tạo file tạm trong repo.

## Căn cứ
Bản vẽ "Spec Produk" của Bing Crab House ghi **"Kunci Susun Apartemen"**, tức khoá xếp chồng kiểu căn hộ. Hộp dưới đỡ hộp trên bằng khoá ở bốn góc, không cần thanh đỡ tầng. Ảnh "Solusi Apartemen Kepiting" cho thấy các cột hộp xếp sát nhau thành tường.

## A. Kiểu bố trí mới, mặc định: "Xếp chồng căn hộ"
- Thêm `stacking: "xep-chong" | "gia-do"`, mặc định là `"xep-chong"`. Kiểu cũ `"gia-do"` giữ lại cho trường hợp đặt hộp trên giá có khoảng hở.
- Khi xếp chồng:
  - Bước tầng = chiều cao hộp − độ lồng của khoá. Độ lồng mặc định 0,5 cm, sửa được.
  - Tầng thấp nhất đặt trên **đế kê** cao khoảng 10 cm, sửa được.
  - Bỏ thanh đỡ tầng. Khung chỉ còn đế kê, dây hoặc thanh chằng mỗi cột hộp và thanh giằng nối các cột trong một dãy.
  - Ô nhập "Khoảng cách tầng" ẩn đi, vì bước tầng tự tính.
- Kiểm tra ổn định:
  - Cảnh báo khi số tầng vượt ngưỡng chồng an toàn. Ngưỡng mặc định 10 tầng, ghi rõ là giả định cần lấy theo nhà sản xuất.
  - Tính tải lên hộp đáy = (số tầng − 1) × (khối lượng hộp + khối lượng nước + khối lượng cua), hiện trong tóm tắt. Mỗi con cua mặc định 0,3 kg.

## B. Đường ống khi xếp chồng
- **Ống góp cấp** chạy qua rãnh chữ U ở mép trước. Khi hộp trên đặt lên, rãnh hộp dưới cùng đáy hộp trên tạo thành lỗ luồn ống. Kiểm tra đường kính ngoài ống không lớn hơn bề rộng rãnh, mặc định rãnh 3,5 cm, sửa được. Nếu lớn hơn thì báo lỗi.
- **Ống góp tràn kiêm xả cặn** chạy qua rãnh ở mép sau, giữ cơ chế ống hút đáy có ống bọc như T4c.
- **Ống đứng** đặt ở hai đầu mỗi dãy cột hộp: một ống đứng cấp và một ống đứng thoát. Ống chính đi dưới sàn hoặc sát chân đế.
- **Xả rửa định kỳ khi xếp chồng:** nhấc ống đứng trong lên khỏi ống bọc, để nước và cặn trong hộp chảy hết qua ống bọc ra ống góp tràn. Không có ống thu xả rửa dưới tầng vì không có khoảng hở.
  - Nhánh chữ Z ở đáy và ống thu xả rửa **chỉ có ở kiểu "gia-do"**. Kiểu xếp chồng tự tắt hai nhánh này, không đưa vào bảng vật tư.
  - Thuỷ lực: kiểm tra ống góp tràn chịu được lưu lượng xả của một hộp. Ước tính bằng thể tích nước trong hộp chia cho thời gian xả mặc định 2 phút, cộng với lưu lượng tràn của các hộp khác trên cùng tầng. Cảnh báo nếu vượt sức tải nửa ống.
- Duyệt đồ thị mạng (`network.ts`) và test đếm tay phải chạy với kiểu xếp chồng.

## C. Cảnh 3D
- Hộp đặt khít lên nhau, khoá ở bốn góc lồng vào nhau. Không còn khe giữa các tầng.
- Ống luồn qua rãnh, nhìn thấy được ở mép trước và mép sau của cả bức tường hộp.
- Chế độ "Một hộp" có hình động mới: nhấc ống đứng trong lên, mực nước hạ xuống, cặn bị cuốn vào ống bọc.
- Đế kê và dây chằng hiển thị được, bật tắt bằng lớp "khung".

## D. Bảng vật tư và tóm tắt
- Kiểu xếp chồng không còn mét thép thanh đỡ tầng. Thay bằng đế kê (theo mét dài dãy hoặc theo số cột), dây chằng (theo số cột) và thanh giằng.
- Diện tích sàn tính lại theo kiểu xếp chồng. Đối chiếu lại với mốc của Bing Crab House: 1000 con trên 6 × 11 m. Báo cáo số mới.
- Cập nhật test cho cấu hình 1 kệ × 2 tầng × 3 hộp xếp chồng. Đếm tay để khẳng định không có thanh đỡ tầng, không có nhánh chữ Z hay ống thu xả rửa, và số kẹp ống đúng.

## E. Cụm van ở hông dãy hộp (bổ sung theo ảnh thực tế của người dùng)
Căn cứ là ảnh hệ ZK AQUA Boxes do người dùng gửi, Claude đã phân tích:
- Cột hộp xếp chồng màu xanh, cửa trước màu trắng có lỗ thoáng, rút ra như ngăn kéo, mỗi ô có mã như "B1".
- Ở hông, tức đầu dãy, có **hai ống đứng PVC trắng song song**.
- Mỗi tầng có **một nhánh ngang từ mỗi ống đứng**, gồm tê, ống ngắn, **van bi tay gạt cam** và **rắc co**, rồi mới nối vào ống góp của tầng.

Cần cài đặt:
1. Ở kiểu xếp chồng, đặt **cụm ống đứng ở hông** tại một đầu dãy, chọn được đầu trái hoặc phải, hoặc cả hai đầu để cấp hai phía. Cụm gồm một ống đứng cấp và một ống đứng thoát, đi sát nhau.
2. **Mỗi tầng, phía cấp:** tê trên ống đứng cấp → ống ngắn → van bi → rắc co → ống góp cấp chạy qua rãnh trước. Đây là "van chặn mỗi tầng", giờ đặt đúng vị trí ở hông.
3. **Mỗi tầng, phía thoát:** ống góp tràn kiêm xả cặn ở rãnh sau → rắc co → van bi → tê vào ống đứng thoát.
   - Thêm tuỳ chọn "van thoát mỗi tầng", mặc định bật.
   - Ghi chú công dụng: cô lập một tầng để xả rửa hoặc bảo trì, nhờ rắc co mà tháo được từng tầng.
4. **Bảng vật tư:** thêm dòng rắc co và van thoát theo tầng. Số van cấp và số rắc co đều bằng số tầng nhân số đầu cấp.
5. **3D:** cụm van ở hông đúng như ảnh, tay gạt van màu cam. Bấm vào van thì chọn được trong bảng vật tư. Có nút "Đóng tầng" để minh hoạ dòng chảy dừng riêng ở tầng được chọn.
6. **Cửa hộp:** thêm tuỳ chọn "cửa ngăn kéo" (kiểu ZK AQUA: mặt trước trắng có lỗ, trượt ra) bên cạnh "cửa bản lề" (kiểu Bing). Hiển thị mã ô theo dạng chữ cái tầng cộng số cột, ví dụ "B1".

## F. Phương án "ống chính trên cao, thoát ra mương sàn" (theo ảnh trại quy mô lớn của người dùng)
Claude phân tích ảnh thứ hai của người dùng, một trại lớn có nhiều khối hộp xanh xếp chồng:
- **Ống chính cấp** bằng PVC xám chạy trên cao dọc đỉnh các khối hộp, có rắc co chia đoạn.
- Từ ống chính, mỗi **tê** rẽ xuống một **van bi tay gạt đỏ** đặt ở đỉnh, rồi nối vào một **ống thả cấp** màu trắng đi dọc mặt bên khối hộp, mỗi tầng có một đầu nhánh cấp. Như vậy **mỗi ống thả có một van**, không phải mỗi tầng một van. Các ống thả đi theo cặp ở khe giữa hai khối.
- **Ống đứng thoát** to hơn, đi theo cặp, có đầu nối ở mỗi tầng, xả thẳng xuống **mương thoát hở trên sàn** chạy dọc chân khối. Mương dẫn về khu lọc.
- Hộp chồng khoảng **18–20 tầng**, đặt trên **bệ bê tông**.
- Khối hộp chia thành **nhiều cụm**, mỗi cụm rộng vài cột hộp. Cụm ống đặt ở khe giữa các cụm.

Cần cài đặt:
1. Thêm lựa chọn **"Phương án cấp thoát"** gồm hai giá trị:
   - **"Van hông theo tầng"** (mục E, kiểu ZK AQUA): ống đứng ở hông, mỗi tầng có van và rắc co.
   - **"Ống chính trên cao, thoát ra mương"** (mục này): ống chính cấp trên cao, mỗi ống thả có một van ở đỉnh, ống đứng thoát xả xuống mương hở.
2. Phương án "Ống chính trên cao":
   - Ống chính chạy dọc đỉnh các khối, cao độ = đỉnh khối + khoảng hở. Có rắc co chia đoạn, mặc định 6 m một đoạn.
   - Mỗi khối có số ống thả = số cột hộp, hoặc tuỳ chọn một ống thả cho mỗi hai cột. Mỗi ống thả có tê, van bi đỏ, ống thả và các đầu nhánh vào từng tầng.
   - Ống đứng thoát đặt theo cặp giữa các khối, đầu nối ở mỗi tầng, chân ống xả vào mương sàn.
   - **Mương thoát:** thêm vào bảng vật tư dưới dạng mét dài mương, có tham số bề rộng và độ dốc. Kiểm tra thuỷ lực bằng công thức Manning cho kênh hở chữ nhật, n ≈ 0,013 cho bê tông trát.
   - Bệ bê tông: tính theo mét dài khối và chiều cao bệ.
   - Thuỷ lực: phân phối nước giữa các ống thả trên ống chính (độ đồng đều), và giữa các tầng trên mỗi ống thả. Ống thả cấp từ trên xuống nên tầng dưới có cột áp cao hơn. Cảnh báo nếu chênh lệch giữa tầng trên và tầng dưới vượt 10%, kèm gợi ý dùng lỗ định lượng.
3. **Ngưỡng chồng: giới hạn theo chiều cao tổng của hệ, thay cho giới hạn theo số tầng.**
   - Căn cứ là video "Quick Walk-through of the Vertical Mud Crab Farm" của RAS Aquaculture (https://www.youtube.com/watch?v=jJqlI1b1gA8): hệ 1000 con cao "slightly above seven feet", phải dùng ghế hoặc thang mới với được tầng trên cùng.
   - Mặc định chiều cao tối đa là **2,2 m**, tính từ sàn tới đỉnh hộp trên cùng, kể cả bệ. Số tầng tối đa tự suy ra từ chiều cao hộp.
   - Hai mức cảnh báo:
     - Đỉnh tầng trên cùng cao hơn **1,8 m**: thông tin "cần ghế hoặc thang".
     - Vượt 2,2 m: cảnh báo.
   - Thay mặc định 20 tầng ở phiên bản trước. Ước lượng đó sai, vì trong ảnh hộp mỏng hơn hộp Bing. Vẫn ghi rõ là cần lấy theo nhà sản xuất hộp.
4. **Cụm khối:** thêm tham số "số cột mỗi khối" và "khe giữa khối" để chia một dãy dài thành nhiều khối như trong ảnh. Cụm ống đặt trong khe.
5. **3D:** ống chính màu xám trên cao, van tay gạt đỏ ở đỉnh, ống thả trắng, ống thoát trắng to hơn xả xuống mương hở có nước chảy, bệ bê tông.

## G. Phòng lọc đề xuất theo lưu lượng thiết kế (theo video RAS Aquaculture)
Thuyết minh video mô tả chuỗi xử lý của trại 1000 con: hộp nuôi (mỗi hộp nước vào qua ống, tràn ra cửa thoát) → mương sàn → **bể lắng giữ cặn**, phần nước trong tràn sang bể sau → **bể vi sinh giá thể trôi** → **hai bơm** → **bình lọc cát** có van đa chiều → **đèn UV** → ống chính cấp → hộp.

Cần cài đặt:
1. Trong tóm tắt của `/thiet-ke`, thêm khối **"Phòng lọc đề xuất"**, tính từ Q thiết kế và tải của số cua. Dùng lại `src/model` và `src/model/calculators.ts`, không viết lại công thức.
   - **Bể lắng:** thể tích theo thời gian lưu nước, mặc định 15 phút, sửa được. Ghi là giả định cần hiệu chỉnh.
   - **Bể vi sinh giá thể trôi:** diện tích và thể tích giá thể, theo hàm MBBR đã có.
   - **Bơm:** hai bơm, một chạy một dự phòng. Lưu lượng Q, cột áp lấy từ `hydraulics`.
   - **Bình lọc cát:** đường kính theo tải lọc, mặc định 30–40 m³/m²·h cho lọc cát nhanh. Ghi nguồn tham khảo.
   - **UV:** liều và công suất theo hàm UV đã có.
   - **Sump:** ≥ 5 phút chạy bơm, như đã làm.
2. Chọn được **"Lọc cơ học"** là *bể lắng + lọc cát* (theo video) hoặc *lọc trống* (như `/quy-trinh`). Đưa thiết bị của phòng lọc vào bảng vật tư thành một nhóm riêng "Phòng lọc", có đơn giá nhập tay.
3. Thêm nút **"Mở trong Quy trình"**, mang theo số hộp, lưu lượng và lựa chọn lọc cơ học. `/quy-trinh` chỉ cần nhận số hộp và lưu lượng như hiện tại. Không bắt buộc thêm thiết bị lọc cát vào `/quy-trinh` ở đợt này.

## H. Cách lắp ráp thực tế và hình động "Lắp ráp" (theo video RAS Aquaculture)
Căn cứ: video "How to assemble the vertical crab house" của RAS Aquaculture (https://www.youtube.com/watch?v=jXCRomdc_o4). Video không có phụ đề. Claude đọc khung hình ở các giây 6, 22, 48, 78 và 112:
- **Giây 6:** hộp được hạ thẳng xuống chồng lên hộp dưới. Rãnh chữ U ở mép hộp dưới nhìn thấy rõ.
- **Giây 22:** cột hộp đặt trên **một hàng gạch bê tông**, chân bệ có lớp sỏi. Cạnh đó là một chồng ống trắng có sẵn cút, chờ lắp.
- **Giây 48:** một **ống góp cấp nằm ngang dọc mép trên của cả tầng**. Ở mỗi vị trí hộp có **một tê kèm đoạn ống ngắn chĩa lên**, làm đầu cấp riêng cho hộp đó. Lắp xong ống thì chồng tầng hộp kế tiếp lên.
- **Giây 78:** một khối rộng khoảng 8–10 cột hộp, mặt trước để hở chưa lắp cửa. **Đầu ống của từng tầng thò ra ở đầu khối**, chờ nối vào ống thả.
- **Giây 112:** cận cảnh bên trong hộp. Ống ngang **chạy xuyên phần trên của hộp** trong rãnh, ngay dưới đáy hộp tầng trên. Mỗi ô có mã dạng **"A49", "A59"**.

Cần cài đặt:
1. **Đầu cấp cho từng hộp:** chọn được giữa "tê + ống ngắn" (theo video) và "lỗ khoan định lượng".
   - Kiểu tê: mỗi hộp có 1 tê và 1 đoạn ống ngắn. Đưa vào bảng vật tư, tính vào tổn thất cục bộ trong `hydraulics`.
   - Kiểu lỗ khoan: không thêm phụ kiện, nhưng có đường kính lỗ để tính độ đồng đều.
2. **Bệ kê:** chọn "gạch bê tông + sỏi" (theo video) hoặc "bệ bê tông đổ" (theo ảnh trại lớn). Bảng vật tư tính số viên gạch theo mét dài khối (tham số kích thước viên gạch) và thể tích sỏi.
3. **Mã ô:** chữ cái là khối (A, B, C…), số đánh liên tục trong khối theo thứ tự cột rồi tầng, ví dụ "A49". Hiện mã trên từng hộp trong 3D (bật tắt được) và trong CSV. Xuất thêm file "Sơ đồ ô" (CSV) gồm mã ô, khối, cột, tầng, toạ độ.
4. **Nút "Lắp ráp" trong 3D:** hình động từng bước, đúng trình tự trong video:
   1. Xếp hàng gạch bê tông và sỏi.
   2. Đặt tầng 1.
   3. Đặt ống góp cấp có tê ở từng hộp lên mép tầng 1.
   4. Đặt tầng 2 chồng lên.
   5. Lặp lại tới tầng trên cùng.
   6. Lắp ống thả đứng hoặc cụm van hông và nối vào đầu ống từng tầng.
   7. Lắp ống góp tràn và ống đứng thoát.
   8. Gắn cửa hộp và mã ô.
   
   Có nút tạm dừng, bước trước, bước sau, và chú thích tiếng Việt cho từng bước. Mỗi bước hiện số vật tư đã dùng tới bước đó, lấy từ `bom` cộng dồn.
5. Ghi nguồn hai video trong code và trong phần ghi chú của trang.

## I. Sức tải ống góp tràn trong rãnh (Claude quyết sau nghiệm thu A–D)
Sau A–D, cấu hình mặc định báo hai cảnh báo:
- Ống DN34 trong rãnh 3,5 cm, tính theo Manning chảy nửa ống, chỉ tải khoảng 6,65 L/phút.
- Một tầng 10 hộp cần 15 L/phút chảy liên tục, và 20,4 L/phút khi xả một hộp.

Quyết định:
1. **Ống góp tràn trong rãnh tính theo chế độ chảy đầy do trọng lực**, không theo chảy nửa ống.
   - Động lực là chênh cao giữa mực nước trong hộp (đỉnh ống tràn) và cao độ cửa ra ở đầu khối. Ống chảy đầy là hợp lệ khi đường năng lượng luôn thấp hơn mực nước trong mọi hộp.
   - Dùng Hazen–Williams (C = 150, PVC) để tính cột áp tổn thất dọc ống, cộng tổn thất cục bộ ở các tê.
   - Kiểm tra: cột áp tổn thất ≤ chênh cao khả dụng, mặc định 3 cm, sửa được. Đồng thời kiểm tra không có hộp nào bị dâng mực nước quá mép trên, với độ dự phòng mặc định 2 cm.
   - Giữ kiểm tra Manning chảy nửa ống cho ống thu xả rửa của kiểu "gia-do", mương sàn và ống chính thoát.
2. **Thoát ở cả hai đầu khối là mặc định** cho kiểu xếp chồng, đúng như ảnh trại thực tế: cụm ống ở khe giữa các khối, cả hai phía. Khi đó mỗi nửa ống góp tải một nửa lưu lượng trên một nửa chiều dài.
3. **Chia khối mặc định:** tối đa 10 cột mỗi khối. Ví dụ 25 cột thì thành 3 khối 9 + 8 + 8, có khe ở giữa, khớp với video lắp ráp và ảnh trại lớn.
4. Khi vẫn không đạt, gợi ý theo thứ tự:
   - giảm số cột mỗi khối;
   - tăng chênh cao cửa ra;
   - dùng hộp có rãnh rộng hơn để lắp DN42;
   - giảm lưu lượng mỗi hộp.
5. **Xả rửa bằng cách nhấc ống đứng:** kiểm theo cùng phương pháp chảy đầy. Ghi chú vận hành: "chỉ xả rửa lần lượt từng hộp trên một tầng".
6. **Mục tiêu:** cấu hình mặc định 2 kệ × 5 tầng × 10 hộp và cấu hình 1000 hộp **không còn cảnh báo đỏ về ống góp tràn**. Thêm test cho cả hai cấu hình, và test Hazen–Williams chảy đầy với một giá trị đối chiếu.

## Tiêu chí nghiệm thu
- `npx.cmd tsc --noEmit`, `npm.cmd test` và `npm.cmd run build` đều đạt. Tự kiểm vẫn 48/48.
- Mở `/thiet-ke` lần đầu thấy ngay kiểu xếp chồng: các hộp sát nhau, không có khe giữa tầng.
- Bảng vật tư kiểu xếp chồng không có dòng thanh đỡ tầng, ống thu xả rửa hay nhánh chữ Z.
- Có cảnh báo khi rãnh nhỏ hơn đường kính ngoài ống, và khi số tầng vượt ngưỡng chồng an toàn.
- Báo cáo kèm bảng vật tư mặc định mới, diện tích sàn của cấu hình 1000 hộp và kết quả ba lệnh kiểm tra.
