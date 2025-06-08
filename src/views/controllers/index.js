import { Application } from '@hotwired/stimulus';

import SearchCardController from './search_card_controller.js';
import SearchController from './search_controller.js';
import SearchLinkController from './search_link_controller.js';

const application = Application.start();

application.register('search', SearchController);
application.register('search-card', SearchCardController);
application.register('search-link', SearchLinkController);
