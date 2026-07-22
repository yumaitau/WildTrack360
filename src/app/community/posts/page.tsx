import { redirect } from 'next/navigation';

// There is no standalone posts index — posts live on the community board. This
// exists so the "Posts" breadcrumb on /community/posts/[id] resolves instead of
// 404ing.
export default function CommunityPostsIndex() {
  redirect('/community');
}
