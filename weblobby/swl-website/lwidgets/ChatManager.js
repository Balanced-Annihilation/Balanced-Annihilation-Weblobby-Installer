///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////


define(
	'lwidgets/ChatManager',
	[
		"dojo/_base/declare",
		
		//"dojo",
		//"dijit",
		
		'dojo/_base/array',
		'dojo/dom-construct',
		'dojo/dom-style',
		'dojo/dom-attr',
		'dojo/dom-geometry',
		'dojo/_base/lang',
		'dojo/topic',
		'dojo/_base/event',
		'dojo/on',
		
		//"lwidgets",
		'dijit/_WidgetBase',
		
		
		'lwidgets/LobbySettings',
		'lwidgets/ChatRoom',
		'lwidgets/PrivChat',
		
		'dijit/Dialog',
		
		'dijit/layout/TabContainer',
		'dijit/layout/ContentPane',
		
		'dijit/form/Button',
		
		'dojo/keys',
		
		'dijit/layout/TabController',
		
		// *** extras ***
		
		'dojo/text',
		'dojox/html/entities'
		
		
	],
	function(declare,
			
			//dojo, dijit,
			
			array, domConstruct, domStyle, domAttr, domGeom, lang, topic, event, on,
			
			WidgetBase,
			
			LobbySettings,
			Chatroom,
			PrivChat,
			
			Dialog,
		
			TabContainer,
			ContentPane,
			
			Button,
			
			keys
			
			,TabController
			
	){
	return declare( [ WidgetBase  ], {
	
	connected: false,
	
	chatrooms: null,
	privchats: null,
	
	started: false,
	curChatroom: '',
	tabCont: '',
	tabs: null,
	
	settings: null,
	nick: '',
	
	users: null, //mixed in
	subscribedChannels: null, //mixed in
	
	madeChannelList: false,
	
	channelListDiv: null,
	
	buildRendering: function()
	{
		var buttons, newButton;
		
		this.chatrooms = {};
		this.privchats = {};
		this.tabs = {};
		this.subscribedChannels = [];
		
		this.domNode = domConstruct.create('div', {style: {height: '100%', width: '100%;' } });
			
		this.tabCont = new TabContainer( {
			style: { height: '100%', marginLeft: '38px' },
			tabPosition: 'left-h',
			useSlider: true
        }).placeAt(this.domNode);

		// Don't close chat tabs on CTRL+DEL.
		this.domNode.addEventListener("keydown", function(e){
			if( e.keyCode == keys.DELETE && e.ctrlKey )
				e.stopPropagation();
		}, true);
        
		buttons = domConstruct.create('div', {id: 'chatmanagerbuttons', style: {} }, this.domNode );
		newButton = new Button( {
            style: {height: '20px', width: '20px'  },
			label: 'Join a Channel',
			showLabel: false,
			iconClass: 'smallIcon roomchatPlusImage',
			onClick: lang.hitch( this, 'makeNewChatRoomDialog' )
        }).placeAt(buttons);
		newButton = new Button( {
            style: {height: '20px', width: '20px'  },
			label: 'Open a Private Message Window',
			showLabel: false,
			iconClass: 'smallIcon privchatPlusImage',
			onClick: lang.hitch( this, 'makeNewPrivChatDialog' )
        }).placeAt(buttons);
		domConstruct.create('br', {}, buttons);
		domConstruct.create('br', {}, buttons);
		newButton = new Button( {
            style: {height: '20px', width: '20px'  },
			label: 'See the Channel List',
			showLabel: false,
			iconClass: 'smallIcon channelListImage',
			onClick: lang.hitch( this, function(){
				if( !this.connected )
				{
					alert2('Please connect to the server first before loading the channel list.');
					return;
				}
				if( this.channelListDiv )
				{
					domConstruct.empty( this.channelListDiv );
				}
				topic.publish( 'Lobby/rawmsg', {msg: 'CHANNELS' } );
			} )
        }).placeAt(buttons);
		
		
		this.subscribe('SetNick', function(data){ this.nick = data.nick } );
		
		//stupid hax
		this.subscribe('ResizeNeeded', function(){ setTimeout( function(thisObj){ thisObj.resizeAlready(); }, 1, this );  } );
		//this.subscribe('ResizeNeeded', this, 'resizeAlready' );
		
		this.subscribe('Lobby/chat/channels', 'addToChannelList' );
		
		this.subscribe('Lobby/focuschat', 'focusChat');
		
	},
	
	postCreate : function()
	{
		this.subscribe('Lobby/chat/addroom', function(data){ this.addChat(data, true) });
		this.subscribe('Lobby/chat/remroom', 'remChatRoom' );
		
		this.subscribe('Lobby/chat/addprivchat', 'addChat' );
		
	},
	
	focusChat: function( data )
	{
		this.tabCont.selectChild( this.tabs[(data.isRoom ? '#' : '') + data.name] );
	},
		
	
	addToChannelList: function(data)
	{
		var channelRow, channelInfo, channelLink;
		this.makeChannelList();
		//channelRow = domConstruct.create( 'div', {'innerHTML': channelInfo }, this.channelListDiv );
		channelRow = domConstruct.create( 'div', {}, this.channelListDiv );
		channelLink = domConstruct.create('a', {
			href: '#',
			innerHTML: data.channel,
			onclick: lang.partial( function(channel, e)
			{
				var smsg = 'JOIN ' + channel
				topic.publish( 'Lobby/rawmsg', {msg: smsg } );
				event.stop(e);
				return false;
			}, data.channel)
		}, channelRow );
		channelInfo = domConstruct.create('span', {innerHTML: (' (' + data.userCount + ' users) ' + data.topic.replace(/\\n/g, '<br />') ) }, channelRow);
		
		domConstruct.create( 'hr', {}, this.channelListDiv );
	},
	
	makeChannelList: function()
	{
		var cp;
		if(!this.madeChannelList)
		{
			this.channelListDiv = domConstruct.create( 'div', {} );
			cp = new ContentPane({
				title: 'Channels',
				content: this.channelListDiv,
				iconClass: 'smallIcon channelListImage',
				closable: true,
				//'onClose':lang.hitch(this, function(){delete this.channelListDiv; this.madeChannelList = false; } ),
				shown: false
			});
			
			cpChat.on( 'close', lang.hitch(this, function(){delete this.channelListDiv; this.madeChannelList = false; } ) );
		
			
			this.tabCont.addChild( cp );
			this.madeChannelList = true;
		}
		
	},
	
	join: function(input, dlg, e)
	{
		var smsg, value;
		value = domAttr.get( input, 'value' )
		if( e.keyCode === 13 )
		{
			smsg = 'JOIN ' + value
			topic.publish( 'Lobby/rawmsg', {msg: smsg } );
			dlg.hide();
		}
	},
	
	openPrivChat: function(input, dlg, e)
	{
		var value;
		value = domAttr.get( input, 'value' )
		if( e.keyCode === 13 )
		{
			this.addChat( {name: value} , false )
			dlg.hide();
		}
	},
	
	makeNewChatRoomDialog: function()
	{
		var dlg, input, contentDiv;
		if( !this.connected )
		{
			alert2('Please connect to the server first before joining a channel.');
			return;
		}
		contentDiv = domConstruct.create( 'div', {} );
		domConstruct.create( 'span', {innerHTML: 'Channel Name '}, contentDiv );
		input = domConstruct.create( 'input', {type: 'text'}, contentDiv );
		
		dlg = new Dialog({
            title: "Join A Channel",
            style: "width: 300px",
			content: contentDiv
        });
		on(input, 'keyup', lang.hitch(this, 'join', input, dlg ) )
		
		dlg.show();
	},
	makeNewPrivChatDialog: function()
	{
		var dlg, input, contentDiv;
		if( !this.connected )
		{
			alert2('Please connect to the server first before starting a private chat.');
			return;
		}
		contentDiv = domConstruct.create( 'div', {} );
		domConstruct.create( 'span', {innerHTML: 'User Name '}, contentDiv );
		input = domConstruct.create( 'input', {type: 'text'}, contentDiv );
		
		dlg = new Dialog({
            title: "Open A Private Message Window",
            style: "width: 300px",
			content: contentDiv
        });
		on(input, 'keyup', lang.hitch(this, 'openPrivChat', input, dlg ) )
		
		dlg.show();
	},
	
	addChat: function( data, isRoom )
	{	
		var newChat, roomName, cpChatroom, iconClass, chatName, chatTabName;
		chatName = data.name;
		chatTabName = chatName;
		
		data.settings = this.settings;
		data.nick = this.nick;
		data.users = this.users;
		data.battleListStore = this.appletHandler.lobby.battleListStore;
		
		if(isRoom)
		{
			if( this.chatrooms[chatName] )
			{
				return;
			}
			if( array.indexOf(this.subscribedChannels, data.name) !== -1 )
			{
				data.subscribed = true;
			}
			data.log = dojox.html.entities.encode( this.appletHandler.readLog( 'channel', data.name ) );
			
			newChat = new Chatroom( data );
			this.chatrooms[chatName] = newChat;
			iconClass = 'smallIcon roomchatImage';
			chatTabName = '#'+chatName;
		}
		else
		{
			if( this.privchats[chatName] ) return;
			data.log = dojox.html.entities.encode( this.appletHandler.readLog( 'user', data.name ) );
			newChat = new PrivChat( data );
			this.privchats[chatName] = newChat;
			iconClass = ( chatName in this.users ) ? 'smallIcon privchatImage' : 'smallIcon privchatMissingImage';
		}
		
		var shrunkTitle = '<div class="chatTitle">' + chatName + '</div>';
		cpChat = new ContentPane({
			title: shrunkTitle ,
			iconClass: iconClass,
			onShow: lang.hitch( this, function(chat1) {
				chat1.startup2();
				setTimeout( function(chat2){
					chat2.resizeAlready();
					chat2.flushChatQueue();
				}, 1, chat1 );
				chat1.focusTextNode();
				//chat1.scrollToBottom();
				setTimeout( function(){
					chat1.scrollToBottom();
				}, 1 );
			}, newChat ),
			closable: true,
			
			//custom stuff
			origTitle: shrunkTitle ,
			shown: false
		});
		cpChat.asdf = true;
		cpChat.set('content', newChat);
		newChat.startup2();
		
		cpChat.on( 'show', lang.hitch( cpChat, 'set', 'title', shrunkTitle  ) )
		cpChat.on( 'show', lang.hitch( cpChat, 'set', 'shown', true ) ); //different from focus
		cpChat.on( 'hide', lang.hitch( cpChat, 'set', 'shown', false ) ); //different from focus
		
		//fixme
		cpChat.onClose = lang.hitch( this, 'closeChatTab', {name: chatName, isRoom: isRoom} );
		
		this.subscribe('Lobby/chat/channel/playermessage', lang.hitch( this, 'notifyActivity', chatName, cpChat ) );
		this.subscribe('Lobby/chat/user/playermessage', lang.hitch( this, 'notifyActivity', chatName, cpChat ) );
		
		this.tabs[chatTabName] = cpChat;
		
		this.tabCont.addChild( cpChat );
		
		
		//don't focus window if someone messaged you
		if( typeof data.msg !== 'string' ) 
		{
			this.tabCont.selectChild( cpChat );
		}
		
	},
	
	//for icon that shows if user is logged on
	checkUser: function( name )
	{
		var cpChat;
		if( !(name in this.privchats ) )
		{
			return;
		}
		cpChat = this.tabs[name];
		iconClass = ( name in this.users ) ? 'smallIcon privchatImage' : 'smallIcon privchatMissingImage';
		cpChat.set( 'iconClass', iconClass );
	},
	
	notifyActivity: function(chatName, cpChat, data)
	{
		if( !cpChat.shown //different from focus
		   && ( chatName === data.channel || chatName === data.userWindow )
		   ) 
		{
			if( typeof data.userWindow !== 'undefined' && this.settings.settings.privateMessageSound )
			{
				playSound('./sound/alert.mp3')
			}
			cpChat.set('title' , '<b>'+cpChat.origTitle+'</b>' );
			//cpChat.set('title' , '<i>'+cpChat.origTitle+'</i>' );
		}
	},
	
	empty: function()
	{
		var tabName, chatroom, privchat;
		for( tabName in this.tabs )
		{
			if( tabName.search('#') !== -1 )
			{
				this.tabCont.removeChild( this.tabs[tabName] );
				delete this.tabs[tabName];
			}
		}
		for( chatroom in this.chatrooms )
		{
			this.chatrooms[chatroom].destroyMe();
		}
		/*
		for( privchat in this.privchats )
		{
			this.privchats[privchat].destroyMe();
		}
		*/
		this.chatrooms = {}
		//this.tabs = {}
	},
	closeChatTab: function(data)
	{
		var name, isRoom
		name = data.name
		isRoom = data.isRoom
		if(isRoom)
		{
			smsg = 'LEAVE ' + name;
			topic.publish( 'Lobby/rawmsg', {msg: smsg } );
		}
		this.deleteChatTab(data);
	},
	
	deleteChatTab: function(data)
	{
		var name, isRoom, tabName
		name = data.name;
		isRoom = data.isRoom
		tabName = isRoom ? '#' + name : name;
		
		this.tabCont.removeChild( this.tabs[tabName] );
		if( isRoom && this.chatrooms[name] )
		{
			this.chatrooms[name].destroyMe();
			delete this.chatrooms[name];
		}
		else if( !isRoom && this.privchats[name] )
		{
			this.privchats[name].destroyMe();
			delete this.privchats[name];
		}
		delete this.tabs[tabName];
	},

	remChatRoom: function( data )
	{
		data.isRoom = true;
		this.closeChatTab(data)
	},
	
	resize: function(dim)
	{
		this.tabCont.resize(dim);
	},

	//stupid hax
	resizeAlready: function()
	{
		this.tabCont.resize();
		var chat, firstTab, firstChat;
	},
	startup2: function()
	{
		var chat, firstTab, firstChat;
		var firstCp
		if( this.started )
		{
			return;
		}
		this.tabCont.startup();
		array.forEach(this.tabCont.getChildren(), function(tab)
		{
			chat = tab.getChildren()[0]
			if(chat)
			{
				chat.startup2();
			}
		});
		this.started = true;	
	},
	
	blank: null
}); });//declare lwidgets.ChatManager



