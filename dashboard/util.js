const sqlite3 = require('sqlite3').verbose();
const mode = ( process.env.READONLY ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE );
const db = new sqlite3.Database( './wikibot.db', mode, dberror => {
	if ( dberror ) {
		console.log( '- Dashboard: Error while connecting to the database: ' + dberror );
		return dberror;
	}
	console.log( '- Dashboard: Connected to the database.' );
} );

/**
 * @typedef Settings
 * @property {String} state
 * @property {String} access_token
 * @property {User} user
 * @property {Object} guilds
 * @property {Map<String, Guild>} guilds.isMember
 * @property {Map<String, Guild>} guilds.notMember
 */

/**
 * @typedef User
 * @property {String} id
 * @property {String} username
 * @property {String} discriminator
 * @property {String} avatar
 * @property {String} locale
 */

/**
 * @typedef Guild
 * @property {String} id
 * @property {String} name
 * @property {String} acronym
 * @property {String} [icon]
 * @property {String} permissions
 */

/**
 * @type {Map<String, Settings>}
 */
const settingsData = new Map();

/**
 * @type {Map<Number, PromiseConstructor>}
 */
const messages = new Map();
var messageId = 1;

process.on( 'message', message => {
	if ( message.id ) {
		if ( message.data.error ) messages.get(message.id).reject(message.data.error);
		else messages.get(message.id).resolve(message.data.response);
		return messages.delete(message.id);
	}
	console.log( '- [Dashboard]: Message received!', message );
} );

/**
 * Send messages to the manager.
 * @param {Object} [message] - The message.
 * @returns {Promise<Object>}
 */
function sendMsg(message) {
	var id = messageId++;
	var promise = new Promise( (resolve, reject) => {
		messages.set(id, {resolve, reject});
		process.send( {id, data: message} );
	} );
	return promise;
}

/**
 * Create a red notice
 * @param {CheerioStatic} $ - The cheerio static
 * @param {Object} notice - The notices to create
 * @param {String} notice.title - The title of the notice
 * @param {String} notice.text - The text of the notice
 * @returns {Cheerio}
 */
function createNotice($, notice) {
	return $('<div class="notice">').append(
		$('<b>').text(notice.title),
		$('<div>').text(notice.text)
	);
}

const permissions = {
	ADMINISTRATOR: 1 << 3,
	MANAGE_CHANNELS: 1 << 4,
	MANAGE_GUILD: 1 << 5,
	MANAGE_MESSAGES: 1 << 13,
	MENTION_EVERYONE: 1 << 17,
	MANAGE_NICKNAMES: 1 << 27,
	MANAGE_ROLES: 1 << 28,
	MANAGE_WEBHOOKS: 1 << 29,
	MANAGE_EMOJIS: 1 << 30
}

/**
 * Check if a permission is included in the BitField
 * @param {String|Number} all - BitField of multiple permissions
 * @param {String} permission - Name of the permission to check for
 * @param {Boolean} [admin] - If administrator permission can overwrite
 * @returns {Boolean}
 */
function hasPerm(all, permission, admin = true) {
	var bit = permissions[permission];
	var adminOverwrite = ( admin && (all & permissions.ADMINISTRATOR) === permissions.ADMINISTRATOR );
	return ( adminOverwrite || (all & bit) === bit )
}

module.exports = {db, settingsData, sendMsg, createNotice, hasPerm};