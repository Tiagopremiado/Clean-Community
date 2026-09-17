import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Category = 'Todos' | 'Skills' | 'MCPs' | 'Workflows' | 'Prompts' | 'Ferramentas' | 'Referências';
export type Role = 'member' | 'moderator' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: Role;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  description: string;
  content: string | null;
  category: Category;
  external_link: string | null;
  likes: number;
  comments_count: number;
  created_at: string;
  profiles?: UserProfile; 
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: UserProfile;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export function formatTimeAgo(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  } catch (e) {
    return 'algum tempo atrás';
  }
}
