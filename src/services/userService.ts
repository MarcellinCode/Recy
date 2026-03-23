import { createClient } from "@/lib/supabase";

export const userService = {
  /**
   * Récupère le profil de l'utilisateur actuel
   */
  async getCurrentProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { ...data, email: user.email };
  },

  /**
   * Déconnexion
   */
  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
};
