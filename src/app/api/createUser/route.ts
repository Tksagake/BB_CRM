import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Extract the id and other fields from the request body
    const { id, full_name, email, password, role, phone, client_company } = await req.json();

    // Check if the email already exists in the "users" table
    const { data: existingUserWithEmail, error: emailCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUserWithEmail) {
      console.error("User with this email already exists:", email);
      return new Response(JSON.stringify({ error: "User with this email already exists" }), { status: 400 });
    }

    // Create user in Supabase Auth with email confirmation enabled
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Enable email confirmation
      user_metadata: { full_name, role, phone, client_company },
    });

    if (error || !data.user?.id) {
      console.error("Error creating user in Supabase Auth:", error?.message);
      return new Response(JSON.stringify({ error: error?.message || "User creation failed" }), { status: 400 });
    }

    console.log("Generated User ID:", data.user.id); // Log the generated ID

    // Check if user already exists (by ID)
    const { data: existingUserWithId, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id) // Use the provided UUID
      .single();

    if (existingUserWithId) {
      console.error("User with this ID already exists:", id);
      return new Response(JSON.stringify({ error: "User with this ID already exists" }), { status: 400 });
    }

    // Insert user into "users" table using the provided UUID
    const { error: dbError } = await supabase.from("users").insert([
      {
        id, // Use the provided UUID
        full_name,
        email,
        phone,
        role,
        client_company,
      },
    ]);

    if (dbError) {
      console.error("Error inserting user into users table:", dbError.message);
      return new Response(JSON.stringify({ error: dbError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: "User created successfully! A confirmation email has been sent." }), { status: 201 });
  } catch (error) {
    console.error("Internal server error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
