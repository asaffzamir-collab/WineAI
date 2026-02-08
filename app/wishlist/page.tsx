// Wishlist screen disabled for now; redirect to home. To re-enable: restore the component
// and data fetch below (see git history), and add wishlist back to bottom-nav and home quick actions.
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function WishlistPageRedirect() {
  redirect('/');
}
