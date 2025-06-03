import { Application } from '@hotwired/stimulus';

// Import controllers directly (Bun-compatible)
import SearchController from './search_controller.js';
import SearchCardController from './search_card_controller.js';
import SearchLinkController from './search_link_controller.js';

// Create and start Stimulus application
const application = Application.start();

// Register controllers manually
application.register('search', SearchController);
application.register('search-card', SearchCardController);
application.register('search-link', SearchLinkController);

export { application };