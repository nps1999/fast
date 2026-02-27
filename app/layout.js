import './globals.css';

export const metadata = {
  title: 'FAST STORE - متجر البطاقات الرقمية',
  description: 'متجر لبيع البطاقات الرقمية وأكواد الشحن للألعاب',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <script 
          src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sb'}&components=buttons,funding-eligibility&enable-funding=card&locale=ar_EG&currency=USD`}
          async
        ></script>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
