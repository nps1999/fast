import './globals.css';

export const metadata = {
  title: 'FAST STORE - متجر البطاقات الرقمية',
  description: 'متجر لبيع البطاقات الرقمية وأكواد الشحن للألعاب',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
