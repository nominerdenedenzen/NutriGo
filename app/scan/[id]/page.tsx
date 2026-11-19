import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scans } from "@/db/schema";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import RecipeButton from "./RecipeButton";


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScanResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Only find the scan if it belongs to the signed-in user.
  const scan = await db.query.scans.findFirst({
    where: and(eq(scans.id, id), eq(scans.userId, userId)),
  });
  if (!scan) notFound();

  // The bucket is private, so make a temporary link (1 hour) to show the photo.
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(scan.photoPath, 60 * 60);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Your photo</h1>

      {signed?.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signed.signedUrl}
          alt="Your uploaded ingredients"
          className="max-h-[480px] w-full max-w-md rounded-2xl object-contain shadow"
        />
      ) : (
        <p className="text-red-600">Could not load the photo. Try refreshing the page.</p>
      )}

      <p className="text-sm text-neutral-500">
        Uploaded {scan.createdAt.toLocaleString()}
      </p>

      {/* Ingredients detected by the Hugging Face vision model */}
      <section className="w-full max-w-md">
        <h2 className="mb-3 text-xl font-semibold">Ingredients found</h2>
        {scan.ingredients && scan.ingredients.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {scan.ingredients.map((item) => (
              <li
                key={item}
                className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No ingredients detected. Try a clearer photo of the food.
          </p>
        )}
      </section>

      <Button render={<Link href="/scan" />} variant="outline">
        Upload another photo
      </Button>
      <RecipeButton ingredients={scan.ingredients ?? []} />


    </main>
  );
}
