import type { Metadata } from "next";
import "./globals.css";

const title = "Investing Clarity Lab｜简投学堂";
const description = "从每天10元开始，看懂你的第一笔长期投资。按真实交易日测算投入，并用可核验历史理解风险、费用和通胀。";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: { title, description, type: "website", locale: "zh_CN" },
  twitter: { card: "summary", title, description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
