// ============================================================
//  src/seed-extra.js — Bổ sung câu hỏi trắc nghiệm cho mỗi môn
//  Chạy sau seed() gốc. Tự bỏ qua nếu đã thêm (tránh trùng lặp).
// ============================================================
import { db } from './db.js';

export function seedExtra() {
  const micro = db.prepare("SELECT id FROM Subjects WHERE code='MICRO'").get();
  if (!micro) return false; // chưa seed gốc

  // Nếu môn MICRO đã có nhiều câu => coi như đã bổ sung, bỏ qua
  const cnt = db.prepare('SELECT COUNT(*) c FROM Questions WHERE subject_id=?').get(micro.id).c;
  if (cnt >= 18) return false;

  const insQ = db.prepare(
    `INSERT INTO Questions (subject_id, chapter_id, type, difficulty, stem, payload, explanation, topic)
     VALUES (@subject_id, @chapter_id, @type, @difficulty, @stem, @payload, @explanation, @topic)`
  );
  const subjectId = (code) => db.prepare('SELECT id FROM Subjects WHERE code=?').get(code)?.id;
  const chaptersOf = (code) => {
    const sid = subjectId(code);
    if (!sid) return [];
    return db.prepare('SELECT id FROM Chapters WHERE subject_id=? ORDER BY ord').all(sid).map(r => r.id);
  };

  // add(mãMôn, chỉ_số_chương, chủ_đề, độ_khó, đề, {options, answer}, giải_thích)
  function add(code, chIdx, topic, difficulty, stem, payload, explanation) {
    const sid = subjectId(code);
    if (!sid) return;
    const chs = chaptersOf(code);
    const cid = chs[chIdx] ?? chs[0];
    insQ.run({ subject_id: sid, chapter_id: cid, type: 'mcq', difficulty, stem,
      payload: JSON.stringify(payload), explanation, topic });
  }

  const tx = db.transaction(() => {
    // ---------------- KINH TẾ VI MÔ ----------------
    add('MICRO', 0, 'Cung cầu', 2, 'Với hàng hoá thứ cấp, khi thu nhập người tiêu dùng tăng thì cầu sẽ:',
      { options: ['Tăng', 'Giảm', 'Không đổi', 'Tăng vô hạn'], answer: 1 },
      'Hàng thứ cấp: thu nhập tăng làm cầu giảm (ngược với hàng thông thường).');
    add('MICRO', 0, 'Hàng thay thế', 3, 'Khi giá cà phê tăng, cầu về trà (hàng thay thế) có xu hướng:',
      { options: ['Giảm', 'Tăng', 'Không đổi', 'Bằng 0'], answer: 1 },
      'Hai hàng thay thế: giá hàng này tăng làm cầu hàng kia tăng.');
    add('MICRO', 0, 'Hàng bổ sung', 3, 'Xăng và ô tô là hai hàng bổ sung. Khi giá xăng tăng mạnh, cầu ô tô có xu hướng:',
      { options: ['Tăng', 'Giảm', 'Không đổi', 'Tăng rồi giảm'], answer: 1 },
      'Hàng bổ sung: giá hàng này tăng làm cầu hàng kia giảm.');
    add('MICRO', 0, 'Độ co giãn', 3, 'Cầu về hàng thiết yếu (như muối) thường có đặc điểm:',
      { options: ['Co giãn nhiều (|Ed|>1)', 'Ít co giãn (|Ed|<1)', 'Co giãn đơn vị (=1)', 'Co giãn hoàn toàn'], answer: 1 },
      'Hàng thiết yếu ít co giãn theo giá: giá đổi nhiều, lượng cầu đổi ít.');
    add('MICRO', 0, 'Giá trần', 3, 'Khi nhà nước áp giá trần thấp hơn giá cân bằng, thị trường sẽ xuất hiện:',
      { options: ['Thặng dư', 'Thiếu hụt', 'Cân bằng mới', 'Dư cung'], answer: 1 },
      'Giá trần dưới giá cân bằng làm lượng cầu > lượng cung → thiếu hụt.');
    add('MICRO', 0, 'Thặng dư tiêu dùng', 4, 'Thặng dư tiêu dùng là:',
      { options: ['Chênh lệch giữa mức giá sẵn lòng trả và giá thực trả',
                  'Tổng doanh thu của doanh nghiệp', 'Lợi nhuận của người bán', 'Chi phí sản xuất biên'], answer: 0 },
      'Thặng dư tiêu dùng = mức sẵn lòng trả − giá thực trả.');
    add('MICRO', 1, 'Đường bàng quan', 3, 'Tỷ lệ thay thế biên (MRS) được thể hiện bằng:',
      { options: ['Độ dốc đường ngân sách', 'Độ dốc đường bàng quan', 'Diện tích dưới đường cầu', 'Hệ số góc đường cung'], answer: 1 },
      'MRS chính là độ dốc (giá trị tuyệt đối) của đường bàng quan.');
    add('MICRO', 1, 'Ràng buộc ngân sách', 2, 'Khi thu nhập người tiêu dùng tăng (giá không đổi), đường ngân sách sẽ:',
      { options: ['Dịch song song ra ngoài', 'Dịch song song vào trong', 'Xoay quanh một điểm', 'Không đổi'], answer: 0 },
      'Thu nhập tăng làm đường ngân sách dịch song song ra ngoài.');
    add('MICRO', 2, 'Năng suất biên', 3, 'Quy luật năng suất biên giảm dần phát biểu rằng khi tăng dần một yếu tố đầu vào (các yếu tố khác cố định):',
      { options: ['Sản lượng tăng vô hạn', 'Năng suất biên của yếu tố đó có xu hướng giảm', 'Chi phí cố định tăng', 'Năng suất biên luôn tăng'], answer: 1 },
      'Khi cố định các yếu tố khác, năng suất biên của yếu tố tăng thêm giảm dần.');
    add('MICRO', 2, 'Chi phí', 2, 'Chi phí trung bình (ATC) được tính bằng:',
      { options: ['TC / Q', 'ΔTC / ΔQ', 'TC − FC', 'FC / Q'], answer: 0 },
      'ATC = tổng chi phí chia cho sản lượng (TC/Q).');
    add('MICRO', 2, 'Tối đa lợi nhuận', 4, 'Doanh nghiệp cạnh tranh hoàn hảo tối đa hoá lợi nhuận tại mức sản lượng mà:',
      { options: ['MR = MC', 'P = FC', 'ATC nhỏ nhất', 'AVC = AFC'], answer: 0 },
      'Điều kiện tối đa lợi nhuận: doanh thu biên bằng chi phí biên (MR = MC).');
    add('MICRO', 2, 'Ngắn hạn & dài hạn', 3, 'Đặc điểm của chi phí trong dài hạn là:',
      { options: ['Mọi chi phí đều biến đổi', 'Có chi phí cố định', 'Không có chi phí biên', 'Chi phí luôn bằng 0'], answer: 0 },
      'Trong dài hạn, doanh nghiệp điều chỉnh mọi yếu tố nên mọi chi phí đều biến đổi.');

    // ---------------- KINH TẾ VĨ MÔ ----------------
    add('MACRO', 0, 'GDP & GNP', 3, 'Điểm khác biệt cơ bản giữa GNP và GDP là:',
      { options: ['GNP tính theo quốc tịch, GDP tính theo lãnh thổ', 'GNP luôn nhỏ hơn GDP',
                  'GDP tính theo quốc tịch', 'Không có khác biệt'], answer: 0 },
      'GDP theo lãnh thổ; GNP theo quyền sở hữu của công dân (kể cả ở nước ngoài).');
    add('MACRO', 0, 'GDP thực', 3, 'GDP thực tế khác GDP danh nghĩa ở chỗ:',
      { options: ['Đã loại trừ yếu tố biến động giá', 'Tính theo giá hiện hành', 'Bao gồm cả hàng trung gian', 'Luôn lớn hơn GDP danh nghĩa'], answer: 0 },
      'GDP thực tính theo giá năm gốc nên loại bỏ ảnh hưởng lạm phát.');
    add('MACRO', 0, 'Tính GDP', 3, 'Theo phương pháp chi tiêu, GDP KHÔNG bao gồm khoản nào sau đây?',
      { options: ['Tiêu dùng hộ gia đình (C)', 'Đầu tư (I)', 'Chi chuyển nhượng (trợ cấp)', 'Chi tiêu chính phủ (G)'], answer: 2 },
      'Chi chuyển nhượng không tạo ra hàng hoá/dịch vụ nên không tính vào GDP.');
    add('MACRO', 0, 'Giá trị gia tăng', 4, 'Việc dùng phương pháp giá trị gia tăng khi tính GDP nhằm:',
      { options: ['Tránh tính trùng giá trị hàng trung gian', 'Tăng GDP', 'Bỏ qua dịch vụ', 'Loại trừ xuất khẩu'], answer: 0 },
      'Cộng giá trị gia tăng các khâu để tránh tính trùng hàng hoá trung gian.');
    add('MACRO', 1, 'Thất nghiệp', 2, 'Tỷ lệ thất nghiệp được tính bằng:',
      { options: ['Số người thất nghiệp / lực lượng lao động', 'Số người thất nghiệp / dân số',
                  'Số người có việc / dân số', 'Lực lượng lao động / dân số'], answer: 0 },
      'Tỷ lệ thất nghiệp = số người thất nghiệp chia cho lực lượng lao động.');
    add('MACRO', 1, 'Lạm phát', 3, 'Lạm phát do cầu kéo xảy ra khi:',
      { options: ['Tổng cầu tăng vượt khả năng cung ứng', 'Chi phí sản xuất tăng',
                  'Cung tiền giảm', 'Năng suất lao động tăng'], answer: 0 },
      'Cầu kéo: tổng cầu tăng mạnh vượt năng lực cung làm giá tăng.');
    add('MACRO', 1, 'Lạm phát', 3, 'Lạm phát do chi phí đẩy thường bắt nguồn từ:',
      { options: ['Giá nguyên nhiên liệu, tiền lương tăng', 'Tổng cầu tăng',
                  'Xuất khẩu tăng', 'Lãi suất giảm'], answer: 0 },
      'Chi phí đẩy: chi phí đầu vào (xăng dầu, lương...) tăng đẩy giá lên.');
    add('MACRO', 1, 'Thất nghiệp tự nhiên', 4, 'Thất nghiệp tự nhiên bao gồm:',
      { options: ['Thất nghiệp cọ xát và cơ cấu', 'Chỉ thất nghiệp chu kỳ',
                  'Toàn bộ lực lượng lao động', 'Thất nghiệp do suy thoái'], answer: 0 },
      'Thất nghiệp tự nhiên = cọ xát + cơ cấu (không gồm chu kỳ).');
    add('MACRO', 1, 'CPI', 3, 'Chỉ số giá tiêu dùng (CPI) được tính dựa trên:',
      { options: ['Một giỏ hàng hoá cố định', 'Toàn bộ hàng hoá trong nền kinh tế',
                  'Chỉ giá xăng dầu', 'Giá hàng xuất khẩu'], answer: 0 },
      'CPI theo dõi giá của một giỏ hàng hoá tiêu dùng cố định.');
    add('MACRO', 2, 'Chính sách tiền tệ', 3, 'Chính sách tiền tệ mở rộng thường gồm:',
      { options: ['Giảm lãi suất, tăng cung tiền', 'Tăng lãi suất, giảm cung tiền',
                  'Tăng thuế', 'Giảm chi tiêu chính phủ'], answer: 0 },
      'Mở rộng tiền tệ: hạ lãi suất và tăng cung tiền để kích thích kinh tế.');
    add('MACRO', 2, 'Công cụ NHTW', 4, 'Công cụ nào KHÔNG thuộc chính sách tiền tệ của ngân hàng trung ương?',
      { options: ['Nghiệp vụ thị trường mở', 'Tỷ lệ dự trữ bắt buộc', 'Lãi suất chiết khấu', 'Thuế thu nhập doanh nghiệp'], answer: 3 },
      'Thuế là công cụ tài khoá (của chính phủ), không phải tiền tệ.');
    add('MACRO', 2, 'Chính sách tài khoá', 3, 'Chính sách tài khoá thắt chặt nhằm kiềm chế lạm phát gồm:',
      { options: ['Giảm chi tiêu chính phủ và/hoặc tăng thuế', 'Tăng chi tiêu và giảm thuế',
                  'In thêm tiền', 'Hạ lãi suất'], answer: 0 },
      'Tài khoá thắt chặt: giảm G hoặc tăng thuế để hạ tổng cầu.');

    // ---------------- KINH TẾ QUỐC TẾ ----------------
    add('INTL', 0, 'Lợi thế tuyệt đối', 2, 'Lý thuyết lợi thế tuyệt đối được nêu bởi:',
      { options: ['Adam Smith', 'David Ricardo', 'Keynes', 'Heckscher'], answer: 0 },
      'Adam Smith nêu lợi thế tuyệt đối; Ricardo phát triển lợi thế so sánh.');
    add('INTL', 0, 'Lợi thế so sánh', 3, 'Lợi thế so sánh dựa trên khái niệm cốt lõi nào?',
      { options: ['Chi phí cơ hội', 'Năng suất tuyệt đối', 'Quy mô dân số', 'Tỷ giá hối đoái'], answer: 0 },
      'Quốc gia chuyên môn hoá theo hàng có chi phí cơ hội thấp hơn.');
    add('INTL', 0, 'Mô hình H-O', 4, 'Theo mô hình Heckscher–Ohlin, một quốc gia sẽ xuất khẩu hàng hoá sử dụng nhiều:',
      { options: ['Yếu tố sản xuất mà nước đó dồi dào', 'Lao động nước ngoài',
                  'Vốn vay quốc tế', 'Tài nguyên nhập khẩu'], answer: 0 },
      'H-O: nước xuất khẩu hàng thâm dụng yếu tố sản xuất mà nó dồi dào.');
    add('INTL', 0, 'Thương mại', 2, 'Lợi ích chung của thương mại quốc tế tự do là:',
      { options: ['Tăng phúc lợi nhờ chuyên môn hoá', 'Luôn có lợi cho mọi cá nhân',
                  'Xoá bỏ cạnh tranh', 'Giảm tổng sản lượng thế giới'], answer: 0 },
      'Chuyên môn hoá theo lợi thế so sánh làm tăng tổng phúc lợi.');
    add('INTL', 1, 'Thuế quan', 3, 'Thuế quan nhập khẩu có tác động:',
      { options: ['Bảo hộ sản xuất trong nước, tăng giá hàng nhập', 'Giảm giá hàng nội địa',
                  'Tăng nhập khẩu', 'Tăng phúc lợi người tiêu dùng'], answer: 0 },
      'Thuế quan tăng giá hàng nhập, bảo hộ nhà sản xuất nội địa.');
    add('INTL', 1, 'Hạn ngạch', 3, 'Hạn ngạch nhập khẩu là biện pháp:',
      { options: ['Giới hạn số lượng hàng được nhập', 'Đánh thuế theo giá trị',
                  'Trợ cấp xuất khẩu', 'Phá giá tiền tệ'], answer: 0 },
      'Hạn ngạch khống chế khối lượng hàng nhập khẩu.');
    add('INTL', 1, 'Trợ cấp', 3, 'Trợ cấp xuất khẩu của chính phủ nhằm:',
      { options: ['Giúp hàng nội địa cạnh tranh hơn ở nước ngoài', 'Tăng giá hàng nhập',
                  'Giảm sản lượng', 'Hạn chế xuất khẩu'], answer: 0 },
      'Trợ cấp giúp hạ giá thành, tăng sức cạnh tranh hàng xuất khẩu.');
    add('INTL', 1, 'Bảo hộ', 4, 'Hàng rào phi thuế quan KHÔNG bao gồm:',
      { options: ['Tiêu chuẩn kỹ thuật, vệ sinh', 'Hạn ngạch', 'Giấy phép nhập khẩu', 'Thuế nhập khẩu'], answer: 3 },
      'Thuế nhập khẩu là hàng rào thuế quan, không phải phi thuế quan.');
    add('INTL', 0, 'Tỷ lệ trao đổi', 4, 'Tỷ lệ trao đổi thương mại (terms of trade) cải thiện khi:',
      { options: ['Giá hàng xuất tăng tương đối so với giá hàng nhập', 'Giá hàng nhập tăng',
                  'Khối lượng nhập tăng', 'Tỷ giá cố định'], answer: 0 },
      'Terms of trade tốt lên khi giá xuất khẩu tăng nhanh hơn giá nhập khẩu.');
    add('INTL', 0, 'Chuyên môn hoá', 3, 'Khi hai quốc gia chuyên môn hoá theo lợi thế so sánh và trao đổi:',
      { options: ['Tổng sản lượng và tiêu dùng đều có thể tăng', 'Một nước luôn thiệt',
                  'Tổng sản lượng giảm', 'Không nước nào có lợi'], answer: 0 },
      'Chuyên môn hoá + thương mại làm tổng sản lượng và tiêu dùng tăng.');
    add('INTL', 1, 'Phá giá', 4, 'Một nước phá giá đồng nội tệ thường nhằm mục tiêu:',
      { options: ['Thúc đẩy xuất khẩu', 'Tăng nhập khẩu', 'Giảm dự trữ ngoại hối', 'Tăng giá hàng xuất'], answer: 0 },
      'Phá giá làm hàng xuất rẻ hơn với nước ngoài, kích thích xuất khẩu.');
    add('INTL', 0, 'Toàn cầu hoá', 2, 'Toàn cầu hoá kinh tế thể hiện rõ nhất qua:',
      { options: ['Gia tăng dòng chảy thương mại, vốn, lao động giữa các nước', 'Đóng cửa biên giới',
                  'Tăng thuế quan', 'Giảm đầu tư nước ngoài'], answer: 0 },
      'Toàn cầu hoá: gia tăng liên kết về thương mại, vốn, lao động, công nghệ.');

    // ---------------- TÀI CHÍNH QUỐC TẾ ----------------
    add('FIN', 0, 'Tỷ giá', 2, 'Tỷ giá hối đoái là:',
      { options: ['Giá của một đồng tiền tính bằng đồng tiền khác', 'Lãi suất ngân hàng',
                  'Giá vàng', 'Chỉ số chứng khoán'], answer: 0 },
      'Tỷ giá là giá của một đồng tiền biểu thị qua một đồng tiền khác.');
    add('FIN', 0, 'Nội tệ mất giá', 3, 'Khi nội tệ mất giá, hàng xuất khẩu của quốc gia sẽ:',
      { options: ['Rẻ hơn với người nước ngoài', 'Đắt hơn với người nước ngoài',
                  'Không đổi', 'Bị cấm xuất'], answer: 0 },
      'Nội tệ yếu làm hàng xuất rẻ hơn khi quy ra ngoại tệ.');
    add('FIN', 0, 'Chế độ tỷ giá', 3, 'Trong chế độ tỷ giá thả nổi, tỷ giá được quyết định bởi:',
      { options: ['Cung cầu ngoại tệ trên thị trường', 'Ngân hàng trung ương ấn định',
                  'Chính phủ cố định', 'Giá vàng thế giới'], answer: 0 },
      'Tỷ giá thả nổi do cung cầu thị trường ngoại hối quyết định.');
    add('FIN', 0, 'Ngang giá lãi suất', 4, 'Lý thuyết ngang giá lãi suất (IRP) liên hệ giữa:',
      { options: ['Chênh lệch lãi suất và chênh lệch tỷ giá kỳ hạn/giao ngay', 'Lạm phát và thất nghiệp',
                  'GDP và dân số', 'Thuế và trợ cấp'], answer: 0 },
      'IRP: chênh lệch lãi suất hai nước phản ánh chênh lệch tỷ giá kỳ hạn và giao ngay.');
    add('FIN', 0, 'PPP', 4, 'Lý thuyết ngang giá sức mua (PPP) cho rằng tỷ giá dài hạn phụ thuộc vào:',
      { options: ['Mức giá tương đối giữa hai quốc gia', 'Lãi suất danh nghĩa',
                  'Quy mô dân số', 'Dự trữ vàng'], answer: 0 },
      'PPP: tỷ giá điều chỉnh theo chênh lệch mức giá (lạm phát) giữa hai nước.');
    add('FIN', 0, 'Tỷ giá tăng', 3, 'Khi tỷ giá (số nội tệ đổi 1 ngoại tệ) tăng, điều đó nghĩa là:',
      { options: ['Nội tệ mất giá', 'Nội tệ lên giá', 'Lạm phát giảm', 'Lãi suất tăng'], answer: 0 },
      'Phải bỏ nhiều nội tệ hơn để đổi 1 ngoại tệ → nội tệ mất giá.');
    add('FIN', 1, 'Cán cân thanh toán', 3, 'Cán cân thanh toán quốc tế (BOP) ghi chép:',
      { options: ['Toàn bộ giao dịch kinh tế giữa một nước với phần còn lại của thế giới', 'Chỉ ngân sách nhà nước',
                  'Chỉ thương mại hàng hoá', 'Chỉ dòng vốn FDI'], answer: 0 },
      'BOP ghi mọi giao dịch kinh tế của một nước với thế giới trong kỳ.');
    add('FIN', 1, 'Tài khoản vãng lai', 3, 'Khoản mục nào thuộc tài khoản vãng lai?',
      { options: ['Cán cân thương mại hàng hoá và dịch vụ', 'Đầu tư trực tiếp nước ngoài',
                  'Vay nợ dài hạn', 'Mua trái phiếu nước ngoài'], answer: 0 },
      'Vãng lai gồm thương mại hàng hoá, dịch vụ, thu nhập và chuyển giao.');
    add('FIN', 1, 'Tài khoản vốn', 3, 'Đầu tư trực tiếp nước ngoài (FDI) được ghi vào:',
      { options: ['Tài khoản vốn và tài chính', 'Tài khoản vãng lai',
                  'Cán cân thương mại', 'Dự trữ vàng'], answer: 0 },
      'FDI là dòng vốn nên thuộc tài khoản vốn và tài chính.');
    add('FIN', 1, 'Thâm hụt', 4, 'Thâm hụt tài khoản vãng lai kéo dài có thể dẫn tới:',
      { options: ['Tăng nợ nước ngoài và áp lực giảm giá nội tệ', 'Tăng dự trữ ngoại hối',
                  'Nội tệ lên giá bền vững', 'Giảm nợ quốc gia'], answer: 0 },
      'Thâm hụt kéo dài làm tăng vay nợ và gây áp lực mất giá nội tệ.');
    add('FIN', 0, 'Dự trữ ngoại hối', 3, 'Ngân hàng trung ương bán ngoại tệ ra thị trường nhằm:',
      { options: ['Hỗ trợ (nâng đỡ) giá trị nội tệ', 'Làm nội tệ mất giá thêm',
                  'Tăng lạm phát', 'Giảm lãi suất'], answer: 0 },
      'Bán ngoại tệ làm tăng cung ngoại tệ, hỗ trợ nội tệ khỏi mất giá.');
    add('FIN', 1, 'Cán cân thương mại', 2, 'Cán cân thương mại thặng dư khi:',
      { options: ['Xuất khẩu lớn hơn nhập khẩu', 'Nhập khẩu lớn hơn xuất khẩu',
                  'Xuất khẩu bằng 0', 'Không có thương mại'], answer: 0 },
      'Thặng dư thương mại: giá trị xuất khẩu vượt nhập khẩu (X > M).');

    // ---------------- KINH TẾ LƯỢNG ----------------
    add('ECONO', 0, 'OLS', 3, 'Phương pháp OLS ước lượng hệ số bằng cách:',
      { options: ['Tối thiểu hoá tổng bình phương phần dư', 'Tối đa hoá R²',
                  'Tối thiểu hoá số biến', 'Tối đa hoá phần dư'], answer: 0 },
      'OLS chọn hệ số sao cho tổng bình phương phần dư (RSS) nhỏ nhất.');
    add('ECONO', 0, 'Hệ số góc', 3, 'Trong mô hình hồi quy Y = β0 + β1X, hệ số β1 cho biết:',
      { options: ['Mức thay đổi của Y khi X tăng 1 đơn vị', 'Giá trị Y khi X=0',
                  'Sai số ngẫu nhiên', 'Tổng bình phương'], answer: 0 },
      'β1 là độ dốc: Y thay đổi bao nhiêu khi X tăng 1 đơn vị.');
    add('ECONO', 0, 'Hệ số chặn', 2, 'Hệ số chặn β0 trong mô hình hồi quy là:',
      { options: ['Giá trị kỳ vọng của Y khi X = 0', 'Độ dốc đường hồi quy',
                  'Phần dư trung bình', 'Hệ số tương quan'], answer: 0 },
      'β0 là tung độ gốc: giá trị Y khi tất cả biến độc lập bằng 0.');
    add('ECONO', 0, 'R bình phương', 3, 'Hệ số R² đo lường:',
      { options: ['Tỷ lệ biến thiên của Y được giải thích bởi mô hình', 'Sai số chuẩn',
                  'Số quan sát', 'Bậc tự do'], answer: 0 },
      'R² ∈ [0,1]: phần trăm biến thiên của biến phụ thuộc được mô hình giải thích.');
    add('ECONO', 0, 'Giả định OLS', 4, 'Một trong các giả định của mô hình hồi quy tuyến tính cổ điển là:',
      { options: ['Kỳ vọng của sai số bằng 0', 'Sai số luôn dương',
                  'Biến độc lập ngẫu nhiên hoàn toàn', 'R² = 1'], answer: 0 },
      'Giả định cổ điển: E(u) = 0, phương sai không đổi, không tự tương quan...');
    add('ECONO', 1, 'Đa cộng tuyến', 4, 'Hậu quả của đa cộng tuyến cao là:',
      { options: ['Sai số chuẩn của hệ số lớn, ước lượng kém chính xác', 'Hệ số luôn bằng 0',
                  'R² giảm mạnh', 'Mất tính tuyến tính'], answer: 0 },
      'Đa cộng tuyến làm phương sai/sai số chuẩn của hệ số tăng, khó suy diễn.');
    add('ECONO', 1, 'Phương sai thay đổi', 4, 'Khi có phương sai thay đổi (heteroskedasticity), ước lượng OLS:',
      { options: ['Vẫn không chệch nhưng không còn hiệu quả', 'Trở nên chệch',
                  'Bằng 0', 'Không tính được'], answer: 0 },
      'Heteroskedasticity: OLS vẫn không chệch nhưng mất hiệu quả, sai số chuẩn sai lệch.');
    add('ECONO', 1, 'Tự tương quan', 4, 'Hiện tượng tự tương quan thường gặp ở dữ liệu:',
      { options: ['Chuỗi thời gian', 'Dữ liệu chéo thuần tuý',
                  'Dữ liệu phân loại', 'Dữ liệu định tính'], answer: 0 },
      'Tự tương quan (sai số tương quan theo thời gian) hay gặp ở chuỗi thời gian.');
    add('ECONO', 1, 'Kiểm định t', 3, 'Kiểm định t trong hồi quy dùng để:',
      { options: ['Kiểm tra ý nghĩa thống kê của từng hệ số', 'Đo R²',
                  'Tính trung bình', 'Đếm số quan sát'], answer: 0 },
      'Kiểm định t xét xem một hệ số có khác 0 một cách có ý nghĩa hay không.');
    add('ECONO', 1, 'Kiểm định F', 4, 'Kiểm định F trong hồi quy bội dùng để:',
      { options: ['Kiểm tra ý nghĩa tổng thể của mô hình', 'Đo độ lệch chuẩn',
                  'Tính phần dư', 'Xác định số biến'], answer: 0 },
      'Kiểm định F xét ý nghĩa đồng thời của toàn bộ các hệ số trong mô hình.');
    add('ECONO', 0, 'Phần dư', 3, 'Phần dư (residual) trong hồi quy là:',
      { options: ['Chênh lệch giữa giá trị thực tế và giá trị dự đoán của Y', 'Hệ số góc',
                  'Giá trị trung bình của X', 'Sai số chuẩn'], answer: 0 },
      'Phần dư = Y thực tế − Y ước lượng từ mô hình.');
    add('ECONO', 0, 'Biến giả', 4, 'Biến giả (dummy) thường được dùng để biểu diễn:',
      { options: ['Yếu tố định tính (giới tính, vùng miền...)', 'Sai số ngẫu nhiên',
                  'Hệ số hồi quy', 'Phương sai'], answer: 0 },
      'Biến giả nhận giá trị 0/1 để đưa yếu tố định tính vào mô hình.');

    // ---------------- THƯƠNG MẠI QUỐC TẾ ----------------
    add('TRADE', 0, 'WTO', 2, 'Chức năng chính của WTO là:',
      { options: ['Thiết lập luật chơi và giải quyết tranh chấp thương mại toàn cầu', 'Phát hành tiền tệ',
                  'Cho vay phát triển', 'Ấn định tỷ giá'], answer: 0 },
      'WTO đặt quy tắc thương mại đa phương và xử lý tranh chấp giữa các thành viên.');
    add('TRADE', 0, 'FTA', 2, 'Đặc trưng của khu vực mậu dịch tự do (FTA) là:',
      { options: ['Xoá bỏ thuế quan nội khối, giữ chính sách riêng với ngoài khối', 'Dùng đồng tiền chung',
                  'Tự do di chuyển lao động hoàn toàn', 'Thống nhất ngân sách'], answer: 0 },
      'FTA: bỏ thuế quan giữa thành viên, mỗi nước giữ chính sách riêng với bên ngoài.');
    add('TRADE', 0, 'Cấp độ hội nhập', 4, 'Cấp độ hội nhập nào cao nhất trong các lựa chọn sau?',
      { options: ['Liên minh kinh tế', 'Khu vực mậu dịch tự do', 'Liên minh thuế quan', 'Thị trường chung'], answer: 0 },
      'Thứ tự tăng dần: FTA → Liên minh thuế quan → Thị trường chung → Liên minh kinh tế.');
    add('TRADE', 0, 'Liên minh thuế quan', 3, 'So với FTA, liên minh thuế quan có thêm đặc điểm:',
      { options: ['Áp dụng biểu thuế quan chung với nước ngoài khối', 'Dùng chung quân đội',
                  'Bỏ hộ chiếu', 'Thống nhất giáo dục'], answer: 0 },
      'Liên minh thuế quan = FTA + biểu thuế quan chung đối ngoại.');
    add('TRADE', 0, 'Thị trường chung', 4, 'Thị trường chung cho phép tự do di chuyển:',
      { options: ['Hàng hoá, dịch vụ, vốn và lao động', 'Chỉ hàng hoá',
                  'Chỉ vốn', 'Chỉ lao động'], answer: 0 },
      'Thị trường chung: tự do lưu chuyển cả hàng hoá, dịch vụ, vốn và lao động.');
    add('TRADE', 1, 'Chuỗi giá trị', 3, 'Chuỗi giá trị toàn cầu (GVC) là:',
      { options: ['Chuỗi các công đoạn tạo giá trị phân bố ở nhiều quốc gia', 'Một loại thuế quan',
                  'Tỷ giá hối đoái', 'Hiệp định song phương'], answer: 0 },
      'GVC: các công đoạn sản xuất - tạo giá trị được phân bổ qua nhiều nước.');
    add('TRADE', 1, 'Vị trí chuỗi', 4, 'Quốc gia đang phát triển thường có nguy cơ bị "kẹt" ở khâu nào của chuỗi giá trị?',
      { options: ['Khâu gia công, giá trị gia tăng thấp', 'Khâu thiết kế, R&D',
                  'Khâu thương hiệu', 'Khâu phân phối toàn cầu'], answer: 0 },
      'Nước đang phát triển dễ kẹt ở gia công - lắp ráp, giá trị gia tăng thấp.');
    add('TRADE', 1, 'Logistics', 2, 'Logistics trong thương mại quốc tế chủ yếu liên quan đến:',
      { options: ['Vận chuyển, kho bãi, phân phối hàng hoá', 'Phát hành cổ phiếu',
                  'Ấn định lãi suất', 'Thu thuế thu nhập'], answer: 0 },
      'Logistics: quản lý dòng vận chuyển, lưu kho và phân phối hàng hoá.');
    add('TRADE', 0, 'Nguyên tắc WTO', 3, 'Nguyên tắc "Đối xử tối huệ quốc" (MFN) trong WTO nghĩa là:',
      { options: ['Ưu đãi dành cho một thành viên phải áp dụng cho mọi thành viên', 'Chỉ ưu đãi nước lớn',
                  'Cấm nhập khẩu', 'Tự do phá giá'], answer: 0 },
      'MFN: không phân biệt đối xử giữa các thành viên - ưu đãi cho một là cho tất cả.');
    add('TRADE', 0, 'Nguyên tắc WTO', 3, 'Nguyên tắc "Đối xử quốc gia" (NT) yêu cầu:',
      { options: ['Hàng nhập khẩu được đối xử không kém hàng nội địa sau khi vào thị trường', 'Cấm hàng nội địa',
                  'Tăng thuế hàng nội', 'Trợ cấp hàng nhập'], answer: 0 },
      'NT: hàng nhập khẩu (sau khi vào) được đối xử bình đẳng như hàng trong nước.');
    add('TRADE', 1, 'Hội nhập VN', 2, 'CPTPP và EVFTA mà Việt Nam tham gia thuộc loại:',
      { options: ['Hiệp định thương mại tự do thế hệ mới', 'Liên minh tiền tệ',
                  'Tổ chức quân sự', 'Quỹ tín dụng'], answer: 0 },
      'CPTPP, EVFTA là các FTA thế hệ mới với cam kết sâu rộng.');
    add('TRADE', 1, 'Lợi ích GVC', 3, 'Tham gia chuỗi giá trị toàn cầu mang lại cơ hội nào cho nước đang phát triển?',
      { options: ['Tiếp cận công nghệ, vốn và thị trường', 'Tự cô lập kinh tế',
                  'Giảm việc làm', 'Tăng thuế nội địa'], answer: 0 },
      'GVC mở ra cơ hội về việc làm, công nghệ, vốn và thị trường xuất khẩu.');
  });

  tx();
  return true;
}
