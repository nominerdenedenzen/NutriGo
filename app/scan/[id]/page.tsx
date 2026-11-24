import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Camera } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import RecipeButton from "./RecipeButton";

export const instant = false; //?

const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ id: string }>; //buffer if it is unable to read the params
}) {
  const { userId, redirectToSignIn } = await auth(); 
  if (!userId) return redirectToSignIn();

  const { id } = await params;
  if (!UUID.test(id)) notFound(); //what is UUID . if it does not match the UUID pattern it sends an error

  const scan = await db.query.scans.findFirst({
    where: and(eq(scans.id, id), eq(scans.userId, userId)),
  });
  if (!scan) notFound();

  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(scan.photoPath, 60 * 60);

  const uploadedAt = scan.createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const photo = (
    <div className="overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm">
      {signed?.signedUrl ? (
        <img
          src={signed.signedUrl}
          alt="Your uploaded ingredients"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-[#FAFAF8] p-6 text-center text-sm text-red-600">
          Could not load the photo. Try refreshing the page.
        </div>
      )}
      <div className="flex items-center gap-2 px-5 py-3 text-xs text-[#101814]/60">
        <Camera className="h-3.5 w-3.5" />
        Scanned {uploadedAt}
      </div>
    </div>
  );

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#1F8A4C]">Your scan</p>
            <h1 className="text-4xl font-semibold tracking-tight text-[#101814] sm:text-5xl">
              What&apos;s cooking today?
            </h1>
          </div>
          <Button
            render={<Link href="/scan" />}
            nativeButton={false}
            variant="outline"
            className="rounded-full border-[#101814]/20 bg-white text-[#101814] hover:bg-[#101814]/5"
          >
            <Camera className="h-4 w-4" />
            Scan another photo
          </Button>
        </div>
        <RecipeButton ingredients={scan.ingredients ?? []} photo={photo} />
      </div>
    </main>
  );
}
