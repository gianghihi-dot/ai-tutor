// ============================================================
//  src/seed.js — Nạp dữ liệu mẫu cho ngành Kinh tế
//  Chạy: npm run seed  (tự động chạy khi DB trống lúc khởi động)
// ============================================================
import { db, initSchema } from './db.js';

// Các câu lệnh INSERT — sẽ được khởi tạo bên trong seed()
// SAU khi bảng đã được tạo (initSchema), tránh lỗi "no such table".
let insSubject, insChapter, insQuestion;

// Tiện ích tạo câu hỏi gọn gàng
function q(subject_id, chapter_id, topic, type, difficulty, stem, payload, explanation) {
  insQuestion.run({
    subject_id, chapter_id, topic, type, difficulty, stem,
    payload: JSON.stringify(payload),
    explanation,
  });
}

export function seed() {
  initSchema();
  const count = db.prepare('SELECT COUNT(*) c FROM Subjects').get().c;
  if (count > 0) return false; // đã có dữ liệu, bỏ qua

  // Chuẩn bị câu lệnh SAU khi các bảng đã tồn tại
  insSubject = db.prepare(
    `INSERT INTO Subjects (code, name, description, icon) VALUES (?, ?, ?, ?)`
  );
  insChapter = db.prepare(
    `INSERT INTO Chapters (subject_id, ord, name, summary) VALUES (?, ?, ?, ?)`
  );
  insQuestion = db.prepare(
    `INSERT INTO Questions (subject_id, chapter_id, type, difficulty, stem, payload, explanation, topic)
     VALUES (@subject_id, @chapter_id, @type, @difficulty, @stem, @payload, @explanation, @topic)`
  );

  const tx = db.transaction(() => {
    // ---------------------------------------------------------
    // 1) KINH TẾ VI MÔ
    // ---------------------------------------------------------
    const microId = insSubject.run('MICRO', 'Kinh tế vi mô',
      'Hành vi của cá nhân, hộ gia đình và doanh nghiệp trên thị trường.', '◭').lastInsertRowid;

    const m1 = insChapter.run(microId, 1, 'Cung – Cầu và giá cả thị trường',
      'Quy luật cung cầu, điểm cân bằng, độ co giãn.').lastInsertRowid;
    const m2 = insChapter.run(microId, 2, 'Lý thuyết hành vi người tiêu dùng',
      'Hữu dụng, đường bàng quan, ràng buộc ngân sách.').lastInsertRowid;
    const m3 = insChapter.run(microId, 3, 'Lý thuyết sản xuất & chi phí',
      'Hàm sản xuất, chi phí ngắn hạn và dài hạn.').lastInsertRowid;

    q(microId, m1, 'Cung cầu', 'mcq', 2,
      'Khi giá một hàng hoá thông thường tăng, các yếu tố khác không đổi, lượng cầu sẽ:',
      { options: ['Tăng', 'Giảm', 'Không đổi', 'Tăng rồi giảm'], answer: 1 },
      'Theo quy luật cầu, giá và lượng cầu nghịch biến: giá tăng thì lượng cầu giảm.');
    q(microId, m1, 'Độ co giãn', 'mcq', 3,
      'Cầu được gọi là co giãn (elastic) khi độ co giãn của cầu theo giá có giá trị tuyệt đối:',
      { options: ['Lớn hơn 1', 'Bằng 1', 'Nhỏ hơn 1', 'Bằng 0'], answer: 0 },
      'Cầu co giãn khi |Ed| > 1: phần trăm thay đổi lượng cầu lớn hơn phần trăm thay đổi giá.');
    q(microId, m1, 'Cân bằng thị trường', 'truefalse', 1,
      'Tại điểm cân bằng thị trường, lượng cung bằng lượng cầu.',
      { answer: true },
      'Đúng. Cân bằng là nơi đường cung và đường cầu cắt nhau, Qs = Qd.');
    q(microId, m1, 'Dịch chuyển cầu', 'fill', 2,
      'Khi thu nhập tăng, cầu về hàng hoá thông thường sẽ dịch chuyển sang bên ____ .',
      { answer: ['phải'], accept: ['phai', 'bên phải', 'ben phai'] },
      'Thu nhập tăng làm tăng cầu hàng thông thường → đường cầu dịch sang phải.');
    q(microId, m1, 'Khái niệm cung cầu', 'matching', 2,
      'Ghép thuật ngữ với định nghĩa đúng:',
      { left: ['Thặng dư', 'Thiếu hụt', 'Giá trần', 'Giá sàn'],
        right: ['Cung > Cầu tại mức giá hiện hành', 'Cầu > Cung tại mức giá hiện hành',
                'Mức giá tối đa do nhà nước quy định', 'Mức giá tối thiểu do nhà nước quy định'],
        answer: [0, 1, 2, 3] },
      'Thặng dư: dư cung; Thiếu hụt: dư cầu; Giá trần: trần giá; Giá sàn: sàn giá.');
    q(microId, m2, 'Hữu dụng', 'mcq', 3,
      'Quy luật hữu dụng biên giảm dần phát biểu rằng khi tiêu dùng thêm một đơn vị hàng hoá:',
      { options: ['Tổng hữu dụng giảm', 'Hữu dụng biên tăng dần',
                  'Hữu dụng biên có xu hướng giảm dần', 'Hữu dụng biên không đổi'], answer: 2 },
      'Hữu dụng biên (MU) của các đơn vị tiêu dùng tăng thêm có xu hướng giảm dần.');
    q(microId, m2, 'Đường bàng quan', 'truefalse', 2,
      'Hai đường bàng quan khác nhau có thể cắt nhau.',
      { answer: false },
      'Sai. Các đường bàng quan không bao giờ cắt nhau vì sẽ vi phạm tính bắc cầu của sở thích.');
    q(microId, m2, 'Tối ưu tiêu dùng', 'essay', 4,
      'Trình bày điều kiện cân bằng tiêu dùng của người tiêu dùng và ý nghĩa kinh tế của nó.',
      { keywords: ['hữu dụng biên', 'giá', 'tỷ lệ', 'ngân sách', 'MU', 'cân bằng'],
        sample: 'Người tiêu dùng tối ưu khi tỷ lệ hữu dụng biên trên giá của các hàng hoá bằng nhau (MUx/Px = MUy/Py) trong giới hạn ngân sách.' },
      'Cần nêu được điều kiện MUx/Px = MUy/Py và ràng buộc ngân sách.');
    q(microId, m3, 'Chi phí', 'mcq', 3,
      'Chi phí cố định (FC) trong ngắn hạn có đặc điểm:',
      { options: ['Thay đổi theo sản lượng', 'Không đổi khi sản lượng thay đổi',
                  'Bằng 0 khi không sản xuất nhưng tăng nhanh', 'Luôn lớn hơn chi phí biến đổi'], answer: 1 },
      'Chi phí cố định không thay đổi theo sản lượng trong ngắn hạn.');
    q(microId, m3, 'Chi phí biên', 'fill', 3,
      'Chi phí ____ là phần chi phí tăng thêm khi sản xuất thêm một đơn vị sản phẩm.',
      { answer: ['biên'], accept: ['bien', 'marginal', 'cận biên', 'can bien'] },
      'Chi phí biên (MC) = ΔTC/ΔQ.');

    // ---------------------------------------------------------
    // 2) KINH TẾ VĨ MÔ
    // ---------------------------------------------------------
    const macroId = insSubject.run('MACRO', 'Kinh tế vĩ mô',
      'Nền kinh tế tổng thể: GDP, lạm phát, thất nghiệp, chính sách.', '◮').lastInsertRowid;

    const k1 = insChapter.run(macroId, 1, 'Đo lường sản lượng quốc gia',
      'GDP, GNP, các phương pháp tính.').lastInsertRowid;
    const k2 = insChapter.run(macroId, 2, 'Lạm phát & thất nghiệp',
      'CPI, các loại lạm phát, đường Phillips.').lastInsertRowid;
    const k3 = insChapter.run(macroId, 3, 'Chính sách tài khoá & tiền tệ',
      'Công cụ chính sách, vai trò ngân hàng trung ương.').lastInsertRowid;

    q(macroId, k1, 'GDP', 'mcq', 2,
      'GDP đo lường:',
      { options: ['Tổng giá trị hàng hoá và dịch vụ cuối cùng sản xuất trong lãnh thổ một quốc gia trong một thời kỳ',
                  'Tổng thu nhập của công dân ở nước ngoài',
                  'Tổng giá trị hàng hoá trung gian', 'Tổng tài sản quốc gia'], answer: 0 },
      'GDP là giá trị thị trường của tất cả hàng hoá & dịch vụ cuối cùng sản xuất trong lãnh thổ.');
    q(macroId, k1, 'GDP danh nghĩa', 'truefalse', 2,
      'GDP thực tế đã loại bỏ ảnh hưởng của biến động giá cả.',
      { answer: true },
      'Đúng. GDP thực tế tính theo giá năm gốc nên loại bỏ yếu tố lạm phát.');
    q(macroId, k1, 'Phương pháp tính GDP', 'matching', 3,
      'Ghép thành phần trong công thức GDP = C + I + G + NX:',
      { left: ['C', 'I', 'G', 'NX'],
        right: ['Tiêu dùng hộ gia đình', 'Đầu tư', 'Chi tiêu chính phủ', 'Xuất khẩu ròng'],
        answer: [0, 1, 2, 3] },
      'C tiêu dùng, I đầu tư, G chi tiêu chính phủ, NX = X − M xuất khẩu ròng.');
    q(macroId, k2, 'Lạm phát', 'mcq', 2,
      'Chỉ số nào thường dùng để đo lạm phát đối với người tiêu dùng?',
      { options: ['CPI', 'GDP', 'PMI', 'M2'], answer: 0 },
      'CPI (chỉ số giá tiêu dùng) đo mức thay đổi giá của giỏ hàng hoá tiêu dùng.');
    q(macroId, k2, 'Thất nghiệp', 'fill', 3,
      'Thất nghiệp ____ phát sinh do sự không ăn khớp giữa kỹ năng người lao động và yêu cầu công việc.',
      { answer: ['cơ cấu'], accept: ['co cau', 'structural'] },
      'Thất nghiệp cơ cấu (structural) do mất cân đối kỹ năng/ngành nghề.');
    q(macroId, k2, 'Đường Phillips', 'essay', 4,
      'Giải thích mối quan hệ giữa lạm phát và thất nghiệp theo đường Phillips ngắn hạn.',
      { keywords: ['lạm phát', 'thất nghiệp', 'đánh đổi', 'ngắn hạn', 'nghịch biến', 'Phillips'],
        sample: 'Trong ngắn hạn tồn tại sự đánh đổi nghịch biến: muốn giảm thất nghiệp thì chấp nhận lạm phát cao hơn và ngược lại.' },
      'Nêu được sự đánh đổi (trade-off) nghịch biến trong ngắn hạn.');
    q(macroId, k3, 'Chính sách tiền tệ', 'mcq', 3,
      'Để chống lạm phát cao, ngân hàng trung ương thường:',
      { options: ['Tăng lãi suất, giảm cung tiền', 'Giảm lãi suất, tăng cung tiền',
                  'In thêm tiền', 'Giảm thuế'], answer: 0 },
      'Chính sách tiền tệ thắt chặt: tăng lãi suất và giảm cung tiền để hạ nhiệt lạm phát.');
    q(macroId, k3, 'Chính sách tài khoá', 'truefalse', 2,
      'Tăng chi tiêu chính phủ là một biện pháp của chính sách tài khoá mở rộng.',
      { answer: true },
      'Đúng. Chính sách tài khoá mở rộng gồm tăng G hoặc giảm thuế để kích cầu.');

    // ---------------------------------------------------------
    // 3) KINH TẾ QUỐC TẾ
    // ---------------------------------------------------------
    const intlId = insSubject.run('INTL', 'Kinh tế quốc tế',
      'Thương mại, lợi thế so sánh, chính sách thương mại.', '◰').lastInsertRowid;

    const i1 = insChapter.run(intlId, 1, 'Lý thuyết thương mại quốc tế',
      'Lợi thế tuyệt đối & lợi thế so sánh.').lastInsertRowid;
    const i2 = insChapter.run(intlId, 2, 'Chính sách thương mại',
      'Thuế quan, hạn ngạch, trợ cấp.').lastInsertRowid;

    q(intlId, i1, 'Lợi thế so sánh', 'mcq', 3,
      'Lý thuyết lợi thế so sánh được phát triển bởi:',
      { options: ['David Ricardo', 'Adam Smith', 'John Keynes', 'Karl Marx'], answer: 0 },
      'David Ricardo phát triển lý thuyết lợi thế so sánh dựa trên chi phí cơ hội.');
    q(intlId, i1, 'Lợi thế tuyệt đối', 'truefalse', 2,
      'Một quốc gia vẫn có thể có lợi khi tham gia thương mại ngay cả khi không có lợi thế tuyệt đối ở bất kỳ mặt hàng nào.',
      { answer: true },
      'Đúng. Theo lợi thế so sánh, thương mại có lợi nếu chi phí cơ hội khác nhau.');
    q(intlId, i1, 'Chi phí cơ hội', 'essay', 4,
      'Phân biệt lợi thế tuyệt đối và lợi thế so sánh, cho ví dụ minh hoạ.',
      { keywords: ['lợi thế tuyệt đối', 'lợi thế so sánh', 'chi phí cơ hội', 'năng suất', 'chuyên môn hoá'],
        sample: 'Lợi thế tuyệt đối dựa trên năng suất cao hơn; lợi thế so sánh dựa trên chi phí cơ hội thấp hơn. Quốc gia nên chuyên môn hoá theo lợi thế so sánh.' },
      'Cần phân biệt theo năng suất (tuyệt đối) và chi phí cơ hội (so sánh).');
    q(intlId, i2, 'Thuế quan', 'mcq', 3,
      'Tác động trực tiếp của thuế quan nhập khẩu là:',
      { options: ['Làm tăng giá hàng nhập khẩu trong nước', 'Làm giảm giá hàng nội địa',
                  'Tăng nhập khẩu', 'Không ảnh hưởng đến giá'], answer: 0 },
      'Thuế quan làm tăng giá hàng nhập khẩu, bảo hộ sản xuất trong nước.');
    q(intlId, i2, 'Hàng rào thương mại', 'fill', 3,
      'Hạn ____ là biện pháp giới hạn số lượng hàng hoá được phép nhập khẩu.',
      { answer: ['ngạch'], accept: ['ngach', 'quota'] },
      'Hạn ngạch (quota) giới hạn khối lượng nhập khẩu.');

    // ---------------------------------------------------------
    // 4) TÀI CHÍNH QUỐC TẾ
    // ---------------------------------------------------------
    const finId = insSubject.run('FIN', 'Tài chính quốc tế',
      'Tỷ giá, cán cân thanh toán, thị trường ngoại hối.', '◱').lastInsertRowid;

    const f1 = insChapter.run(finId, 1, 'Tỷ giá hối đoái',
      'Cơ chế tỷ giá, yết giá, biến động.').lastInsertRowid;
    const f2 = insChapter.run(finId, 2, 'Cán cân thanh toán',
      'Tài khoản vãng lai, tài khoản vốn.').lastInsertRowid;

    q(finId, f1, 'Tỷ giá', 'mcq', 3,
      'Khi đồng nội tệ mất giá so với ngoại tệ, điều gì có xu hướng xảy ra?',
      { options: ['Xuất khẩu trở nên rẻ hơn với nước ngoài, có lợi cho xuất khẩu',
                  'Nhập khẩu rẻ hơn', 'Lạm phát giảm ngay lập tức', 'Không ảnh hưởng thương mại'], answer: 0 },
      'Nội tệ mất giá làm hàng xuất khẩu rẻ hơn với nước ngoài, thúc đẩy xuất khẩu.');
    q(finId, f1, 'Chế độ tỷ giá', 'truefalse', 2,
      'Trong chế độ tỷ giá thả nổi hoàn toàn, tỷ giá do cung cầu ngoại tệ trên thị trường quyết định.',
      { answer: true },
      'Đúng. Tỷ giá thả nổi được xác định bởi cung cầu thị trường ngoại hối.');
    q(finId, f2, 'Cán cân thanh toán', 'matching', 3,
      'Ghép khoản mục với tài khoản tương ứng trong cán cân thanh toán:',
      { left: ['Xuất nhập khẩu hàng hoá', 'Đầu tư trực tiếp nước ngoài', 'Kiều hối', 'Vay nợ nước ngoài'],
        right: ['Tài khoản vãng lai', 'Tài khoản vốn & tài chính', 'Tài khoản vãng lai', 'Tài khoản vốn & tài chính'],
        answer: [0, 1, 2, 3] },
      'Thương mại hàng hoá & kiều hối thuộc vãng lai; FDI & vay nợ thuộc tài khoản vốn.');
    q(finId, f2, 'Tài khoản vãng lai', 'essay', 4,
      'Cán cân tài khoản vãng lai gồm những thành phần nào? Thâm hụt vãng lai kéo dài có rủi ro gì?',
      { keywords: ['thương mại', 'dịch vụ', 'thu nhập', 'chuyển giao', 'thâm hụt', 'nợ', 'tỷ giá'],
        sample: 'Gồm cán cân thương mại, dịch vụ, thu nhập và chuyển giao. Thâm hụt kéo dài làm tăng nợ nước ngoài và áp lực lên tỷ giá.' },
      'Nêu 4 thành phần và rủi ro nợ/tỷ giá khi thâm hụt kéo dài.');

    // ---------------------------------------------------------
    // 5) KINH TẾ LƯỢNG
    // ---------------------------------------------------------
    const econId = insSubject.run('ECONO', 'Kinh tế lượng',
      'Mô hình hồi quy, kiểm định và ứng dụng thống kê.', '◲').lastInsertRowid;

    const e1 = insChapter.run(econId, 1, 'Hồi quy tuyến tính',
      'Mô hình OLS, hệ số góc, R bình phương.').lastInsertRowid;
    const e2 = insChapter.run(econId, 2, 'Kiểm định & khuyết tật',
      'Đa cộng tuyến, phương sai thay đổi, tự tương quan.').lastInsertRowid;

    q(econId, e1, 'OLS', 'mcq', 3,
      'Phương pháp bình phương nhỏ nhất (OLS) tối thiểu hoá:',
      { options: ['Tổng bình phương phần dư', 'Tổng phần dư', 'Tổng giá trị tuyệt đối phần dư', 'Hệ số xác định'], answer: 0 },
      'OLS tối thiểu hoá tổng bình phương phần dư (RSS).');
    q(econId, e1, 'R bình phương', 'truefalse', 2,
      'Hệ số xác định R² luôn nằm trong khoảng từ 0 đến 1 và cho biết phần trăm biến thiên của biến phụ thuộc được giải thích bởi mô hình.',
      { answer: true },
      'Đúng. R² ∈ [0,1], càng gần 1 mô hình giải thích càng tốt.');
    q(econId, e2, 'Đa cộng tuyến', 'fill', 4,
      'Hiện tượng các biến độc lập có tương quan mạnh với nhau gọi là đa ____ .',
      { answer: ['cộng tuyến'], accept: ['cong tuyen', 'multicollinearity'] },
      'Đa cộng tuyến (multicollinearity) khiến ước lượng kém chính xác.');
    q(econId, e2, 'Phương sai thay đổi', 'essay', 5,
      'Hậu quả của hiện tượng phương sai thay đổi (heteroskedasticity) đối với ước lượng OLS là gì?',
      { keywords: ['phương sai', 'không chệch', 'hiệu quả', 'sai số chuẩn', 'kiểm định', 'BLUE'],
        sample: 'Ước lượng OLS vẫn không chệch nhưng không còn hiệu quả; sai số chuẩn bị sai lệch khiến các kiểm định t, F không đáng tin.' },
      'Nêu: vẫn không chệch nhưng mất tính hiệu quả, sai số chuẩn sai lệch.');

    // ---------------------------------------------------------
    // 6) THƯƠNG MẠI QUỐC TẾ
    // ---------------------------------------------------------
    const tradeId = insSubject.run('TRADE', 'Thương mại quốc tế',
      'Hội nhập, WTO, chuỗi cung ứng toàn cầu.', '◳').lastInsertRowid;

    const t1 = insChapter.run(tradeId, 1, 'Hội nhập kinh tế quốc tế',
      'Các cấp độ hội nhập, WTO, FTA.').lastInsertRowid;
    const t2 = insChapter.run(tradeId, 2, 'Chuỗi giá trị toàn cầu',
      'Phân công lao động quốc tế, logistics.').lastInsertRowid;

    q(tradeId, t1, 'WTO', 'mcq', 2,
      'WTO là tên viết tắt của tổ chức nào?',
      { options: ['Tổ chức Thương mại Thế giới', 'Quỹ Tiền tệ Quốc tế',
                  'Ngân hàng Thế giới', 'Liên Hợp Quốc'], answer: 0 },
      'WTO = World Trade Organization, Tổ chức Thương mại Thế giới.');
    q(tradeId, t1, 'Cấp độ hội nhập', 'matching', 3,
      'Ghép cấp độ hội nhập với đặc điểm:',
      { left: ['Khu vực mậu dịch tự do (FTA)', 'Liên minh thuế quan', 'Thị trường chung', 'Liên minh kinh tế'],
        right: ['Bỏ thuế quan nội khối', 'Bỏ thuế quan + biểu thuế chung với ngoài khối',
                'Tự do di chuyển hàng hoá, vốn, lao động', 'Thống nhất chính sách kinh tế & tiền tệ'],
        answer: [0, 1, 2, 3] },
      'Mức độ hội nhập tăng dần: FTA → Liên minh thuế quan → Thị trường chung → Liên minh kinh tế.');
    q(tradeId, t1, 'FTA', 'truefalse', 1,
      'Hiệp định thương mại tự do (FTA) nhằm cắt giảm hoặc xoá bỏ thuế quan giữa các nước thành viên.',
      { answer: true },
      'Đúng. FTA hướng tới tự do hoá thương mại giữa các thành viên.');
    q(tradeId, t2, 'Chuỗi giá trị', 'essay', 4,
      'Chuỗi giá trị toàn cầu là gì? Việc tham gia chuỗi giá trị toàn cầu mang lại cơ hội và thách thức gì cho quốc gia đang phát triển?',
      { keywords: ['chuỗi giá trị', 'công đoạn', 'gia tăng', 'cơ hội', 'thách thức', 'công nghệ', 'phụ thuộc'],
        sample: 'Chuỗi giá trị toàn cầu là chuỗi các công đoạn tạo giá trị phân bố ở nhiều quốc gia. Cơ hội: việc làm, công nghệ, thị trường. Thách thức: dễ kẹt ở khâu giá trị thấp, phụ thuộc bên ngoài.' },
      'Nêu khái niệm + cơ hội (việc làm, công nghệ) + thách thức (giá trị thấp, phụ thuộc).');
  });

  tx();
  return true;
}

// Cho phép chạy trực tiếp: node src/seed.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const done = seed();
  console.log(done ? '✓ Đã nạp dữ liệu mẫu thành công.' : '• Dữ liệu đã tồn tại, bỏ qua.');
}