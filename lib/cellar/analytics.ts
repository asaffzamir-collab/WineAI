import { track } from '@vercel/analytics';

type CellarEvent =
  | 'cellar_opened'
  | 'rack_created'
  | 'rack_edited'
  | 'slot_clicked'
  | 'bottle_moved'
  | 'bottle_added_to_slot'
  | 'location_picker_opened'
  | 'sommelier_opened_from_cellar'
  | 'tonight_mode_from_cellar'
  | 'heatmap_toggled'
  | 'view_switched'
  | 'rack_builder_opened';

export function trackCellar(
  event: CellarEvent,
  properties?: Record<string, string | number | boolean>,
) {
  try {
    track(event, properties);
  } catch {
    // Silently fail if analytics not available
  }
}
