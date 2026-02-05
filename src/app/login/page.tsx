"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const supabase = createBrowserSupabase();

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/");
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm card p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            מהרשת למדף
          </h1>
          <p className="text-sm text-muted mt-1">צוד. שמור. בשל.</p>
        </div>
        <div dir="ltr">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#e85d04",
                    brandAccent: "#c2410c",
                  },
                  borderWidths: {
                    buttonBorderWidth: "0px",
                    inputBorderWidth: "1px",
                  },
                  radii: {
                    borderRadiusButton: "16px",
                    buttonBorderRadius: "16px",
                    inputBorderRadius: "16px",
                  },
                },
              },
            }}
            providers={["google"]}
            redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback`}
            localization={{
              variables: {
                sign_in: {
                  email_label: "אימייל",
                  password_label: "סיסמה",
                  button_label: "התחברות",
                  link_text: "יש לך כבר חשבון? התחבר",
                },
                sign_up: {
                  email_label: "אימייל",
                  password_label: "סיסמה",
                  button_label: "הרשמה",
                  link_text: "אין לך חשבון? הירשם",
                },
              },
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
