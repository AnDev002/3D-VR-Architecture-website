import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Danh sách các ngôn ngữ được hỗ trợ dựa trên cấu trúc thư mục của bạn
// trong /public/locales
const supportedLngs = ['en', 'de', 'es', 'fr', 'ja', 'ko', 'pt', 'ru', 'vi', 'zh-CN'];

i18n
  // Tải các file translation qua http (từ thư mục /public/locales)
  .use(HttpApi)
  // Tự động phát hiện ngôn ngữ của trình duyệt
  .use(LanguageDetector)
  // Tích hợp i18n instance vào react-i18next
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLngs,
    // Ngôn ngữ mặc định nếu ngôn ngữ của người dùng không được hỗ trợ
    fallbackLng: 'en', 
    // Bật chế độ debug trong môi trường phát triển để xem log
    debug: process.env.NODE_ENV === 'development',

    // Cấu hình cho LanguageDetector
    detection: {
      // Thứ tự phát hiện: localStorage -> trình duyệt -> thẻ html
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Lưu ngôn ngữ đã chọn vào localStorage để ghi nhớ lựa chọn của người dùng
      caches: ['localStorage'],
    },

    // Cấu hình cho HttpApi backend
    backend: {
      // Đường dẫn đến các file ngôn ngữ của bạn
      loadPath: '/locales/{{lng}}/translation.json',
    },

    react: {
      // Sử dụng Suspense để xử lý việc tải không đồng bộ các file ngôn ngữ
      useSuspense: true,
    },
    
    // Tùy chọn này giúp tránh việc key bị escape nếu nó chứa các ký tự đặc biệt
    interpolation: {
      escapeValue: false, 
    }
  });

export default i18n;
