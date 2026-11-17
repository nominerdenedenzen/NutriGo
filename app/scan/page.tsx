import { auth } from "@clerk/nextjs/server";
import PhotoUpload from "./PhotoUpload";

export default async function ScanPage() {
  // Not signed in? Go to the Clerk sign-in page, then come back here.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Scan your ingredients</h1>
      <PhotoUpload />
    </main>
  );
}
