import net from "node:net";

export type DashboardServiceStatus = {
  reachable: boolean;
};

const SERVICE_HOST = "127.0.0.1";
const SERVICE_PORT = 26339;

export async function readDashboardServiceStatus(): Promise<DashboardServiceStatus> {
  return {
    reachable: await isTcpReachable(SERVICE_HOST, SERVICE_PORT),
  };
}

async function isTcpReachable(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (reachable: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
