import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PromptNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4">
        <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Prompt Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The prompt you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to prompts
          </Link>
        </Button>
      </div>
    </main>
  );
}
