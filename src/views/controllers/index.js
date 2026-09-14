import { Application } from '@hotwired/stimulus';

import GateController from './gate_controller.js';
import HomeController from './home_controller.js';
import SearchCardController from './search_card_controller.js';
import SearchLinkController from './search_link_controller.js';

const application = Application.start();

application.register('gate', GateController);
application.register('home', HomeController);
application.register('search-card', SearchCardController);
application.register('search-link', SearchLinkController);
