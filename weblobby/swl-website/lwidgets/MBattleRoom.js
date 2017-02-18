///////////////////////////////////

// JS Spring Lobby Interface

// By CarRepairer

// License: GPL 2

///////////////////////////////////


define(
	'lwidgets/MBattleRoom',
	[
		"dojo/_base/declare",
		'dojo/_base/array',

		'dojo/query',
		'dojo/dom-construct',
		'dojo/dom-style',
		'dojo/dom-attr',
		'dojo/dom-class',
		'dojo/_base/lang',
		'dojo/topic',
		
		'dojo/_base/event',
		'dojo/on',
		'dojo/mouse',
		'dojo/store/Memory',

		'lwidgets/BattleRoom',
		'lwidgets/ScriptManager',
		
		
		'dijit/Tooltip',
		'dijit/form/Select',
		
		'dojo/request/xhr',
		
		//extras
		'dojo/dom', //needed for widget.placeAt to work now
		
		

	],
	function(declare,
		array,
		query, domConstruct, domStyle, domAttr, domClass, lang, topic, event, on, mouse, Memory,
		BattleRoom, ScriptManager,
		Tooltip,
		Select,
		xhr
	){
	return declare( [ BattleRoom ], {
	
	saystring: 'SAYBATTLE',
	spads: false,
	bname: 'Multiplayer Battleroom',
	showingLaunchTooltip: false,
	
	postCreate3: function()
	{
		// Add this class for the hacky code that changes the start button label.
		domClass.add(this.domNode, "mbattleroom");

		this.subscribe('Lobby/battles/addplayer', 'addPlayer' );
		this.subscribe('Lobby/battles/remplayer', 'remPlayer' );
		this.subscribe('Lobby/battle/playerstatus', 'setPlayState');
		this.subscribe('Lobby/battle/playermessage', 'battlePlayerMessage' );
		this.subscribe('Lobby/battles/updatebattle', 'updateBattle' );
		this.subscribe('Lobby/unitsyncRefreshed', 'unitsyncRefreshed' );
		this.subscribe('Lobby/download/processProgress', 'updateBar' );
		this.subscribe('Lobby/battle/ring', 'ring' );
		this.subscribe('Lobby/mission', 'playMission' );

		on(this.progressIcon, 'mouseover', lang.hitch(this, function(){
			var battle = this.battleListStore.get(this.battleId);
			domAttr.set( this.progressIcon, 'title', 'Game running' + (battle && battle.progressSince ? ' for ' +
				Math.floor( (new Date() - battle.progressSince) / 60000 ) + ' minutes' : '') );
		}));

		this.showLog();
	},
	
	sourcePortGetTimer: {},
	//updatePlayStateTimer: {},
	getSourcePort: function()
	{
		var internalSourcePortIp
		internalSourcePortIp = this.appletHandler.sendSomePacket();
		
		if( this.hosting )
		{
			//should never be in here
			this.hostPort = internalSourcePortIp;
		}
		else
		{
			this.sourcePort = internalSourcePortIp;
		}
	},
	startTimer: function(timer, delay, func)
	{
		if( timer.ref )
		{
			return;
		}
		func();
		timer.ref = setInterval( func, delay );
	},
	stopTimer: function(timer)
	{
		clearInterval(timer.ref);
		timer.ref = null;
	},
	
	battlePlayerMessage: function(data)
	{
		var msgArr, rest, pollTitle;
		var pollData;
		var y;
		var n;
		var total;
		//* Springie8 Poll: Do you want to change to a suitable random map? [!y=0/1, !n=0/1]
		if( data.name === this.host && data.ex )
		{
			// [semprini]Autohost * CloggerMac called a vote for command "bset startmetal 1000" [!vote y, !vote n, !vote b]
			// [semprini]Autohost * Vote in progress: "bset startmetal 1000" [y:1/2, n:0/1(2)] (25s remaining)
		
			msgArr = data.msg.split(' ');
			//echo(msgArr)
			if( data.msg.search(/called a vote.*".*"/) !== -1 )
			{
				pollTitle = data.msg.match(/called a vote.*"(.*)"/)[1];
				domStyle.set( this.pollNode, 'display', 'block' );
				this.pollYesBar.set( {maximum: total, label: '? / ?' } );
				this.pollNoBar.set( {maximum: total, label: '? / ?' } );
				
				this.pollYesBar.update( {progress: 0 } );
				this.pollNoBar.update( {progress: 0 } );
				
				domAttr.set( this.pollNameNode, 'innerHTML', pollTitle);
			}
			else if( data.msg.search(/Vote for .*(passed|failed)/) !== -1 ||
				data.msg.search(/no vote in progress/) !== -1 ||
				data.msg.search(/[Vv]ote cancelled/) !== -1 ||
				data.msg.search(/[Cc]ancelling.*vote/) !== -1)
			{
				domStyle.set( this.pollNode, 'display', 'none' );
			}
			else if( msgArr[0] === 'Poll:' || data.msg.search('Vote in progress:') !== -1 )
			{
				if( this.spads )
				{
					pollData = data.msg.match(/\[y:(\d*)\/(\d*).*, n:(\d*)\/(\d*).*\]/);
				}
				else
				{
					pollData = data.msg.match(/\[!y=(\d*)\/(\d*), !n=(\d*)\/(\d*)\]/);
				}
				if( pollData !== null && pollData.length > 0 )
				{
					domStyle.set( this.pollNode, 'display', 'block' );
					y = pollData[1];
					total = pollData[2];
					n = pollData[3];
					if( this.spads )
					{
						pollTitle = data.msg.match(/Vote in progress:.*"(.*)"/)[1];
					}
					else
					{
						pollTitle = msgArr.slice(1).join(' ').replace(/\[!y=.*\]/, '');
					}
					domAttr.set( this.pollNameNode, 'innerHTML', pollTitle);
					
					this.pollYesBar.set( {maximum: total, label: y + ' / ' + total } );
					this.pollNoBar.set( {maximum: total, label: n + ' / ' + total } );
					
					this.pollYesBar.update( {progress: y } );
					this.pollNoBar.update( {progress: n } );
					
					return;
				}
				else
				{
					domStyle.set( this.pollNode, 'display', 'none' );
				}
			}
			else if( data.msg.search(/Hi.*\(SPADS.*automated host\)/) !== -1 )
			{
				this.spads = true;
			}
		}
		this.playerMessage(data);
	},
	sayYes: function()
	{
		var vote = this.spads ? '!vote y' : '!y';
		this.safeSay( vote );
	},
	sayNo: function()
	{
		var vote = this.spads ? '!vote n' : '!n';
		this.safeSay( vote );
	},
	
	finishedBattleStatuses: function()
	{
		this.gotStatuses = true;
		this.updatePlayState();
	},

	updateBattle: function(data)
	{
		var smsg;
		if( this.battleId !== data.battleId )
		{
			return;
		}
		if( typeof data.map !== 'undefined' && this.map !== data.map )
		{
			this.map = data.map;
			this.battleMap.setMap( this.map ); 
			// Call setmap before this line because this function will load mapoptions based on that map.
			this.setSync(); 		
		}
		
		if( this.hosting )
		{
			smsg = 'UPDATEBATTLEINFO 0 0 ' + this.mapHash + ' ' + this.map;
			topic.publish( 'Lobby/rawmsg', {msg: smsg } );
				
			return;
		}

		if( typeof data.progress !== 'undefined' )
		{
			if( !this.runningGame && data.progress && this.gotStatuses ) //only start game automatically if you were already in the room
			{
				this.startGame(false);
			}
			else if( this.runningGame && data.progress === false && this.startDialog )
			{
				this.startDialog.cancel();
			}

			this.runningGame = data.progress;
			domStyle.set( this.progressIconDiv, 'display', this.runningGame ? 'inline' : 'none' );
		}
	},
	
	updatePlayState: function()
	{
		var fakeUser;
		if( this.battleId !== 0 && this.gotStatuses )
		{
			fakeUser = clone( this.users[this.nick] )
			
			var spec = this.specState;
			if(!this.synced && !this.specState && this.settings.settings.autoSpecIfUnsynced)
			{
				this.syncCheckDialog( 'You cannot join a team yet because you are missing content. It will be automatically downloaded.', true );
				spec = true;
			}

			// This is an ugly hack and should be rewritten.
			query(".mbattleroom .startGameButtonLabel").forEach(lang.hitch(this, function(node){
				node.innerHTML = spec ? "Spectate" : "Start";
			}));
			
			fakeUser.setStatusVals({
				isSpectator: spec,
				allyNumber: this.allianceId,
				teamNumber: this.wantTeamId > -1 ? this.wantTeamId : this.getEmptyTeam(this.nick),
				syncStatus: this.synced ? 'Synced' : 'Unsynced',
				side: this.faction,
				isReady: true
			}, true);
			fakeUser.setTeamColor(this.teamColor);
			fakeUser.sendBattleStatus();
		}
	},

	setPlayState: function( data )
	{
		if( data.name !== this.nick || !this.gotStatuses ) return;
		this.specState = data.user.isSpectator;
		this.playStateButton.setChecked( !this.specState );
		this.allianceId = data.user.allyNumber;
		this.faction = data.user.side;
		
		
		this.battleMap.setSelectedAlliance(this.allianceId, this.specState);
	},

	remPlayer: function( data )
	{
		var pname, line, user;
		if( data.battleId !== this.battleId )
		{
			return;
		}
		this.remPlayerByName( data.name )
	},
	
	addPlayer: function( data )
	{
		var pname, line, user, ateam, aiNum;
		pname = data.name;

		if( pname === '' )
		{
			return;
		}
		if( data.battleId !== this.battleId )
		{
			return;
		}

		if( !this.users[this.nick].isInGame && this.settings.settings.roomJoinSound &&
			this.playerListNode.userCount < parseInt(this.settings.settings.joinSoundWhenRoomSmallerThan) )
		{
			playSound('./sound/4_tone_ding.mp3');
		}

		this.addPlayerByName( pname )
	},
	
	joinBattle: function( data )
	{
		var blistStore = this.battleListStore;
		var smsg;

		this.battleId = data.battleId;
		
		this.playerNum = 0;
		this.aiNum = 0;

		// This increases the risk of wrong unitsync calls getting interleaved,
		// but otherwise a single failure in setSync() will prevent the lobby
		// from fully syncing until it's restarted.
		this.setSyncCheckingGame = false;
		this.setSyncLoadingGame = false;
		
		domStyle.set( this.hideBattleNode, 'display', 'none' );
		domStyle.set( this.battleDivNode, 'display', 'block' );

		if( !this.specState )
		{
			setTimeout(lang.hitch(this, function(){
				this.specState = false;
				this.updatePlayState();
			}), 1000);
		}
		this.specState = true;
		this.updatePlayState();

		this.closeNode.set('disabled', false);

		this.resizeAlready(); //for startup

		if( typeof data.gameHash !== 'undefined' )
		{
			this.gameHash = data.gameHash;
		}
		this.hosting = false;
		if( typeof data.hosting !== 'undefined' )
		{
			this.hosting = data.hosting;
		}
		if( this.hosting )
		{
			smsg = 'SETSCRIPTTAGS game/startpostype=2';
			topic.publish( 'Lobby/rawmsg', {msg: smsg } );
		}
		else
		{
			this.startTimer( this.sourcePortGetTimer, 20000, lang.hitch(this, 'getSourcePort') );
			//this.startTimer( this.updatePlayStateTimer, 15000, lang.hitch(this, 'updatePlayState') );
		}
		
		
		domStyle.set( this.pollNode, 'display', 'none' );
		
		this.inBattle = true;
		//this.scriptPassword = data.scriptPassword;

		this.gameWarningIconDiv = domConstruct.create('span', {} );
		this.gameWarningIcon = domConstruct.create('img', {
			src: 'img/warning.png',
			height: '16',
			//'title': title goes here
		}, this.gameWarningIconDiv);
		
		var item;
		item = blistStore.get(data.battleId);
		
		if( typeof item === 'undefined' )
		{
			return;
		}
		var members, playerlist, title, player_name;
		members 		= parseInt( item.members );
		playerlist 		= item.playerlist;
		this.host		= item.host;
		this.map		= item.map;
		title			= item.title;
		this.game 		= item.game;
		this.ip 		= item.ip;
		this.hostPort 	= item.hostport;
		this.natType	= item.natType;
		
		this.engine		= item.engineVersion;

		setTimeout( lang.hitch(this, function(){
			this.flushChatQueue();
		}), 100);
		this.setTitle( title )
		
		// This indirectly calls setSync() on UnitsyncRefreshed *after* the
		// correct SpringData is set.  If we call setSync() directly, for
		// steam users it will try to get mods/maps before SpringData is
		// set to their steam folder and the lobby won't sync.
		if( this.appletHandler.getUnitsync(this.engine) )
			this.appletHandler.refreshUnitsync(this.engine);
		else // We don't have the engine, call setSync() directly.
			this.setSync();
		
		this.battleMap.setMap( this.map );

		for(player_name in playerlist)
		{
			this.addPlayer( { battleId: this.battleId, name: player_name } )
		}

		this.resizeAlready();
		this.loadedBattleData = true;
		
		this.runningGame = this.players[this.host].isInGame;
		
		var node = this.startGameButton.domNode
		domStyle.set( this.progressIconDiv, 'display', this.runningGame ? 'inline' : 'none' );
		if( this.runningGame )
		{
			this.showingLaunchTooltip = true;
			Tooltip.show("Battle is in progress. Click here to launch the game.", node, ['below'], true);
			on.once(node, mouse.leave, lang.hitch(this, function(){
				Tooltip.hide(node);
				this.showingLaunchTooltip = false;
			}) )
			setTimeout(lang.hitch(this, function(){
				Tooltip.hide(node);
				this.showingLaunchTooltip = false;
			}), 10000);
			
			
			
		}
		
		
		this.appletHandler.lobby.focusBottom();
		this.scrollToBottom();
		
	}, //joinBattle
	
	
	resizeAlready2: function()
	{
		var node = this.startGameButton.domNode
		
		this.battleMap.updateMapDiv();
		this.playerListNode.resizeAlready();
		
		if( this.showingLaunchTooltip )
		{
			Tooltip.hide(node);
			Tooltip.show("Battle is in progress. Click here to launch the game.", node, ['below'], true);
		}
	},
	
	
	leaveBattle: function()
	{
		topic.publish( 'Lobby/rawmsg', {msg: 'LEAVEBATTLE' } );
		this.closeBattle();
	},

	closeBatlle: function()
	{
		this.inherited(arguments);
		this.stopTimer(this.sourcePortGetTimer);
		this.showingLaunchTooltip = false;
	},
	
	setSync: function()
	{
		var mapChecksum, gameHash, mapDownloadProcessName;
		this.gotMap = false;
		this.gameHashMismatch = false;
		this.recentAlert = false;

		if( !this.inBattle )
		{
			return;
		}
			
		if( this.getUnitsync() !== null )
		{
			this.gotEngine = true;
			this.hideEngineDownloadBar();
		}
		else
		{
			this.showEngineDownloadBar();
			this.updateGameWarningIcon();
			return //don't continue if no engine
		}
		
		if( !this.gotGame && !this.setSyncCheckingGame )
		{
			this.setSyncCheckingGame = true;
			this.showUnitsyncSpinner();

			this.getGameIndex().then(lang.hitch(this, function(idx){
				this.gameIndex = idx;
				var downloadGame = lang.hitch(this, function(){
					this.gameDownloadProcessName = this.downloadManager.downloadPackage( 'game', this.game );
					this.showGameDownloadBar();
				});
			
				if( this.gameIndex !== false )
				{
					this.getUnitsync().getPrimaryModChecksum( this.gameIndex ).then(lang.hitch(this, function(gameHash){
						var hash = this.gameHash;
						// Make sure it's unsigned uint32, because unitsync returns unsigned,
						// but the protocol uses signed for hash.
						if( hash < 0 )
						{
							hash = 0xffffffff + 1 + hash;
						}
						console.log( 'Game hashes: ' + hash + ", " + gameHash)
						if( hash === 0 || hash === gameHash )
						{
							this.gotGame = true;
							this.setSyncCheckingGame = false;
							this.setSync();
						}
						else
						{
							this.gameHashMismatch = true;
							downloadGame();
							this.setSyncCheckingGame = false;
						}
					}));
				}
				else
				{
					this.hideUnitsyncSpinner();
					downloadGame();
					this.setSyncCheckingGame = false;
				}
			})).always(lang.hitch(this, 'hideUnitsyncSpinner')).otherwise(function(){
				console.log("Failed deferred in MBattleRoom::setSync() when checking game");
			});
		}

		if( this.gotGame && !this.setSyncLoadingGame )
		{
			this.setSyncLoadingGame = true;
			this.hideGameDownloadBar();
			this.showUnitsyncSpinner();

			var this_ = this;
			this.addArchives().then(function(){
				return this_.loadFactions();
			}).then(function(){
				return this_.loadGameBots();
			}).then(function(){
				return this_.loadModOptions();
			}).then(function(){
				if( this_.gotMap )
					return this_.battleMap.loadMapOptions();
			}).then(function(){
				this_.setSyncLoadingGame = false;
			}).always(lang.hitch(this, 'hideUnitsyncSpinner'));
		}

		this.getMapChecksum().then(lang.hitch(this, function(mapChecksum){
			if( mapChecksum !== false )
			{
				this.mapHash = mapChecksum;
				this.gotMap = true;
				this.battleMap.hideBar();
				this.battleMap.setGotMap(true);
			}
			else
			{
				this.gotMap = false;
				this.battleMap.setGotMap(false);
				mapDownloadProcessName = this.downloadManager.downloadPackage( 'map', this.map );
				this.battleMap.showBar(mapDownloadProcessName)
			}
			this.updateGameWarningIcon();

			this.synced = ( this.gotGame && this.gotMap && this.gotEngine );
			this.updatePlayState();
		}));
		
	}, //setSync
	
	ring: function( data )
	{
		var name, line, smsg;
		name = data.name;
		line = '*** ' + name + ' is ringing you!';
		this.addLine( line, '' );
		if( this.synced )
		{
			return;
		}
		smsg = this.saystring + ' ';
		if( !this.gotEngine )
		{
			smsg += 'Downloading engine - ' + this.engineDownloadBar.get('progress') + '%. ';
		}
		if( !this.gotGame && this.gotEngine )
		{
			smsg += 'Downloading game - ' + this.gameDownloadBar.get('progress') + '%. ';
		}
		if( !this.gotMap && this.gotEngine )
		{
			smsg += 'Downloading map - ' + this.battleMap.mapDownloadBar.get('progress') + '%. ';
		}
		
		topic.publish( 'Lobby/rawmsg', {msg: smsg } );
	},

	updateGameWarningIcon: function()
	{
		var warningTitle;
		
		if( this.gameWarningIconDiv === null ) //not used in single player room
		{
			return;
		}
		
		if( this.gotGame )
		{
			domStyle.set( this.gameWarningIconDiv, {display: 'none'} );
			return;
		}
		
		domStyle.set( this.gameWarningIconDiv, {display: 'inline'} );
		if( !this.gotEngine )
		{
			warningTitle = 'The engine is still downloading.'
		}
		else if( this.gameHashMismatch )
		{
			warningTitle = 'Your game does not match the host\s! It will be redownloaded.'
		}
		else
		{
			warningTitle = 'You do not have this game, it will be downloaded.';
		}
		domAttr.set( this.gameWarningIcon, 'title', warningTitle );
		
	},
	
	
		
	newBattleAdvancedToggle: function()
	{
		var showingAdvanced;
		showingAdvanced = domStyle.get( this.newBattleAdvancedDiv, 'display' ) === 'table';
		domStyle.set( this.newBattleAdvancedDiv, 'display', showingAdvanced ? 'none' : 'table');
		this.newBattleAdvancedButton.set('label', (showingAdvanced ? 'Show' : 'Hide') + ' Advanced Options');
	},
	updateRapidTag: function(val)
	{
		this.newBattleRapidTag.set( 'value', val );
	},
	
	playMission: function(data)
	{
		var url;
		var missionName;
		var missionId;
		var missionMatch;
		// SAIDPRIVATE Nightwatch !JSON SiteToLobbyCommand {"SpringLink":"http://zero-k.info/Missions/Detail/140@start_mission:Tutorial - Running Start r169"}
		url = data.SpringLink
		console.log('play mission ' + url)
		missionName = '';
		missionMatch = url.match(/@start_mission:(.*)/);
		if( missionMatch )
		{
			missionName = missionMatch[1];
			if( missionName !== '' )
			{	
				if( missionName.substr(missionName.length-1, 1) === ')' ) //temp fix
				{
					missionName = missionName.substr(0, missionName.length-1); 
				}
				this.spawnSpringieBattle( missionName, 'Mission: ' + missionName, '', true ); //4th param = modOnly, for missions to work
			}
			return;
		}
		
		missionMatch = url.match(/@start_script_mission:/);
		if( missionMatch )
		{
			missionId = missionMatch[1];
			missionId = '97';
			xhr('http://weblobby.springrts.com/getmissionscript.suphp', {
				query: {scriptId: missionId},
				handleAs: 'json',
				sync: false
			}).then(
				lang.hitch(this, function(data){
					console.log("getmissionscript.suphp:");
					console.log(data)
					var script = data.script;
					script = script.replace( '%MAP%', data.map );
					//script = script.replace( '%MOD%', data.rapidTag );
					script = script.replace( '%MOD%', 'Zero-K v1.2.3.7' );
					script = script.replace( '%NAME%', 'ikinz_test' );
					this.scriptMissionScript = script;
					this.spawnSpringieBattle( data.rapidTag, 'Mission: ' + missionName, '', true ); //4th param = modOnly, for missions to work
				})
			);
		}
		
	},
	
	createGameButtonClick: function()
	{
		var smsg, springie, foundSpringie, i;
		var newBattlePassword;
		var mapName;
		var gameName;
		var battleType;
		
		newBattlePassword = this.newBattlePassword.value;
		
		if( this.hostTabShowing === 'directHostingTab' || this.hostTabShowing === 'replayHostingTab' )
		{
			if( this.hostTabShowing === 'directHostingTab' )
			{
				battleType = 0;
				this.gameHash = this.getUnitsync().getPrimaryModChecksum( this.gameSelect.value )
				mapName = 'Small_Divide-Remake-v04';
				gameName = this.gameSelect.get('displayedValue');
			}
			else
			{
				var replayPath, file, index, sm
				var version
				
				battleType = 1;
				replayPath = this.appletHandler.springHome + '/demos/' + this.replaySelect.get('value');
				file = this.appletHandler.applet.ReadFileMore( replayPath, 1000 );
				
				index = file.indexOf("[game]");
				sm = new ScriptManager({});
				//console.log (index); console.log (replayPath);
				sm.descriptify( file, '', index )
				//echo( sm.scriptTree )
				
				version = file.match(/\-> Version: ([\d\.]*)/);
				version = version[1];
				this.engine = version;
				
				this.gameHash = 0;
				gameName = sm.scriptTree.game.gametype;
				mapName = sm.scriptTree.game.mapname;
				
			}
			
			this.maphash = 0;
			if( newBattlePassword === '' )
			{
				newBattlePassword = '*';
			}
			
			
			//NAT traversal method used by the host. Must be one of: 0: none 1: Hole punching 2: Fixed source ports
			var natType;
			var internalSourcePortIp;
			
			natType = this.holePunchingCheck.get('checked') ? '1' : '0';
			internalSourcePortIp = this.appletHandler.sendSomePacket();
			//this.hostPort = 8452;
			this.hostPort = internalSourcePortIp;
			
			smsg = 'OPENBATTLE '+ battleType +' ' + natType + ' '+newBattlePassword+' ' + this.hostPort + ' 16 '+this.gameHash+' 0 ' +this.maphash
				+ '\t' + 'spring ' + this.engine + '\t' + mapName + '\t' + this.newBattleName.value + '\t' + gameName;
			topic.publish( 'Lobby/rawmsg', {msg: smsg } );
			
			
			
			if( this.hostTabShowing === 'replayHostingTab' )
			{
				/*
				//this sends over 1024 bytes, throttled by server
				var replayModOptions, modoptionKey, modoptionVal;
				replayModOptions = [];
				for( modoptionKey in sm.scriptTree.game.modoptions )
				{
					modoptionVal = sm.scriptTree.game.modoptions[modoptionKey]
					replayModOptions.push( 'game/modoptions/' + modoptionKey + '=' + modoptionVal )
				}
				smsg = 'SETSCRIPTTAGS ';
				smsg += replayModOptions.join('\t');
				topic.publish( 'Lobby/rawmsg', {'msg':smsg } );
				*/
			}
		}
		else
		{
			this.spawnSpringieBattle( this.newBattleRapidTag.value, this.newBattleName.value, newBattlePassword );
		}
		this.newBattleDialog.hide();
	
	},
	spawnSpringieBattle: function( newBattleMod, newBattleName, newBattlePassword, modOnly) //newBattleMod can be a raipd tag
	{
		var smsg, springie, foundSpringie, i;
		
		i = 0;
		while( !foundSpringie && i < 100 )
		{
			//springie = 'Springiee' + (i===0 ? '' : i);
			springie = 'Plutonium' + (i===0 ? '' : i);
			if( springie in this.users )
			{
				foundSpringie = true;
				topic.publish( 'Lobby/setNewBattleReady', newBattlePassword );
				if( modOnly )
				{
					smsg = 'SAYPRIVATE '+springie+' !spawn mod='+ newBattleMod;
				}
				else
				{
					smsg = 'SAYPRIVATE '+springie+' !spawn mod='+ newBattleMod
						+',title='+ newBattleName +',password=' + newBattlePassword + ',engine='+this.springVersionInput.get('value');
				}
				topic.publish( 'Lobby/rawmsg', {msg: smsg } );
			}
			i += 1;
		}
	},
	
	makeBattle: function()
	{
		if( !this.authorized )
		//if( 0 )
		{
			alert2('Please connect to the server first before creating a multiplayer battle.');
			return;
		}
		
		
		replayFiles = this.appletHandler.getReplays()
		replayOptions = [];
		array.forEach( replayFiles, function(replayFileName){
			replayOptions.push( { name: replayFileName, id: replayFileName } )
		}, this);
		this.replaySelect.set( 'autoComplete', false );
		this.replaySelect.set( 'queryExpr', '*${0}*' );
		//this.replaySelect.set( 'highlightMatch', 'all' );
		this.replaySelect.set( 'store', new Memory({ data: replayOptions }) )
		
		
		this.newBattleDialog.show();
		this.newBattleName.set( 'value', this.nick + '\'s Game!' );
	},
	
	
	hostTabShowing: '',
	changeHostTab: function()
	{
		this.hostTabShowing = this.getShownTab()
		if( this.hostTabShowing === 'directHostingTab' )
		{
			this.updateDirectHostingForm();
		}
		domStyle.set( this.holePunchingCheck.domNode, 'display', this.hostTabShowing === 'autohostTab' ? 'none' : 'block' )
	},
	
	getShownTab: function()
	{
		var children, shownTab
		children = this.hostTabs.getChildren()
		shownTab = array.filter(children, function(tab){ return tab.get('selected'); })
		return shownTab[0].get('name');
	},
	

	blank: null
}); });//define lwidgets/Battleroom
