import { LoginPage } from "@/components/sites/livemarket/pages/LoginPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { previousPath } = await searchParams;
  // Only same-site paths are accepted as a return destination.
  const path = typeof previousPath === "string" && previousPath.startsWith("/") && !previousPath.startsWith("//")
    ? previousPath
    : "/";
  return <LoginPage previousPath={path} />;
}
