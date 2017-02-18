///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////


define(
	'lwidgets/PrivChat',
	[
		"dojo/_base/declare",
		
		'dojo/topic',
		'dojo/_base/array',
		'dojo/_base/lang',
		
		'dojo/dom-construct',
		
		'dojo/text!./templates/privchat.html?' + cacheString,
		
		'lwidgets/Chat',
		
		//extras
		
		
	],
	function(declare,
		topic, array, lang, domConstruct,
		template, Chat ){
	return declare( [ Chat ], {

	templateString : template,	

	saystring: 'SAYPRIVATE',
	name : "",
	chatType: 'user',
	
	postCreate2: function()
	{
		var friendsList;
		
		this.addSubscription( this.subscribe('Lobby/chat/user/playermessage', 'playerMessage' ) );
		this.addSubscription( this.subscribe('Lobby/chat/privmsg/' + this.name, lang.hitch(this, function(data) {
			this.sendMessage(data.msg); })) );
		
		this.friendToggleButton.setChecked( this.settings.isInList( this.name, 'friendsList' ) );
		
		this.updateInfoBox();
		
		this.showLog();
		
		
		this.addSubscription( this.subscribe('Lobby/updateUser', 'updateUser' ) );
		this.addSubscription( this.subscribe('Lobby/battle/playerstatus', 'updateUser' ) );
		
		//this.subscribe('Lobby/battle/playerstatus', 'updateUserPlayerStatus' );

		dropDownDontStealFocus(this.chatColorDropDown);
	},
	
	
	updateUser: function( user )
	{
		var name;
		name = user.name;
		
		if( name !== this.name)
		{
			return;
		}
		this.updateInfoBox();
	},
	
	
	updateInfoBox:function()
	{
		var user, battleIcon, os, lobbyClient
		
		if( this.name in this.users )
		{			
			domConstruct.empty(this.infoBox);
			user = this.users[this.name];
			domConstruct.place( user.getFlag(), this.infoBox );
			domConstruct.place( user.getUserIcon(true), this.infoBox );
			
			battleIcon = user.getBattleIcon(this.battleListStore, false)
			if (battleIcon ) {
				domConstruct.place( battleIcon, this.infoBox );
			}
			os = user.getOsIcon();
			if (os ) {
				domConstruct.place( os, this.infoBox );
			}
			if (user.clan) {
				domConstruct.place( user.getClanIcon(), this.infoBox );
			}
			lobbyClient = user.getLobbyClientIcon();
			if( lobbyClient )
			{
				domConstruct.place( lobbyClient, this.infoBox );
			}
			if (user.isAdmin) {
				domConstruct.place( user.getAdminIcon(), this.infoBox );
			}
			if (user.isAway) {
				domConstruct.place( user.getAwayIcon(), this.infoBox );
			}
			
			
			
		}
	},
	
	//override
	sendMessage: function(msg)
	{
		var smsg;
		
		if( this.name in this.users )
		{
			this.inherited(arguments);
			return;
		}
		
		smsg = 'SAYPRIVATE Nightwatch !pm ' + this.name + ' ' + msg;
		topic.publish( 'Lobby/notidle', {} );
		topic.publish( 'Lobby/rawmsg', {msg: smsg } );
		
		this.addLine( msg, 'chatMine', 'Offline', this.nick );
		
	},
	
	toggleFriend: function(value)
	{
		this.settings.setListSetting(this.name, value, 'friendsList' )
	}
}); }); //declare lwidgets.Privchat



