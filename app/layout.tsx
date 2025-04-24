import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { CopilotKit } from "@copilotkit/react-core";
import { cookies } from 'next/headers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open MCP Client",
  description: "An open source MCP client built with CopilotKit ",
  icons: {
    icon: '/icon.png', 
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get API key from cookies if available
  const cookieStore = await cookies();
  const apiKeyCookie = cookieStore.get('openai-api-key');
  const apiKey = apiKeyCookie?.value || "";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-screen h-screen`}
      >
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          // agent="mcp_agent"
          headers={{
            "x-openai-api-key": apiKey, // API key from cookie or fallback
          }}
          showDevConsole={false}
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
