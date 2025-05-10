export default function handler(req, res) {
  console.log("ENV SUPABASE_URL:", !!process.env.SUPABASE_URL);
  console.log("ENV SUPABASE_ANON_KEY:", !!process.env.SUPABASE_ANON_KEY);

  res.status(200).json({
    message: "API route is working!",
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    },
  });
}
