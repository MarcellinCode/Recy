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
   * Met à jour le profil de l'utilisateur
   */
  async updateProfile(updates: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    return true;
  },

  /**
   * Déconnexion
   */
  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
};
