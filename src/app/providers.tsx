"use client";

import { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { App, ConfigProvider } from "antd";
import { store } from "@/store";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { HydrateAuth } from "@/components/common/HydrateAuth";
import { antTheme } from "@/lib/theme";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <HydrateAuth>
        <ConfigProvider theme={antTheme}>
          <AntdRegistry>
            <App>{children}</App>
          </AntdRegistry>
        </ConfigProvider>
      </HydrateAuth>
    </Provider>
  );
}
