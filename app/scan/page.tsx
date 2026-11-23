import { auth } from "@clerk/nextjs/server";
import PhotoUpload from "./PhotoUpload";


// Auth gates the whole page, so there is no static shell worth streaming first.
export const instant = false;

export default async function ScanPage() {
  // Not signed in? Go to the Clerk sign-in page, then come back here.
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-12">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#1F8A4C]">Step 1 of 2</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">Scan your ingredients</h1>
      </div>
      <PhotoUpload />

    </main>
  );
}
