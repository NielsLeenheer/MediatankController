
TelnetProtocol = Class.create({
	initialize: function(host, options) {
		this.options = Object.extend({
			onConnect: 	function(){},
			onError:	function(){},
			onData:		function(){},
			onClose:	function(){}
		}, options || {});
		
		this.connected = false;
		this.error = false;
		this.parsing = false;
		this.buffer = [];
		
		this.socket = new air.Socket();
		this.socket.addEventListener(air.Event.CONNECT, this.onConnect.bind(this));
		this.socket.addEventListener(air.Event.CLOSE, this.onClose.bind(this));
		this.socket.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, function(){});
		this.socket.addEventListener(air.IOErrorEvent.IO_ERROR, this.onError.bind(this));
		this.socket.addEventListener(air.ProgressEvent.SOCKET_DATA, this.onData.bind(this));

		if (!this.error) {
			this.socket.connect(host, 23);
		}
	},
	
	onConnect: function() {
		this.connected = true;
		
		this.sendDo(3);
		this.sendWill(24);
		this.options.onConnect();
	},
	
	onClose: function() {
		this.connected = false;
		
		this.options.onClose();
	},
	
	onError: function() {
		this.error = true;
		this.options.onError();
	},
	
	onData: function() {
		while (this.socket.bytesAvailable) {
			var c = this.socket.readUnsignedByte();
			this.buffer.push(c);
		}
		
		if (!this.parsing) {
			this.bufferedData();
		}
	},
	
	bufferedData: function() {
		this.parsing = true;
		
		var cooked = '';
		
		while (this.buffer.length) {
			var c = this.buffer.shift();
			if (c == 255) {
				var command = this.buffer.shift();
				var option = null;
				
				if (command == 255) {
					cooked += String.fromCharCode(255);
					continue;
				}
				
				if (command >= 251 && command <= 254) {
					option = this.buffer.shift();
				}
				
				this.handleCommand(command,option);
			} else {
				cooked += String.fromCharCode(c);
			}
		}
		
		this.options.onData(cooked);
		this.parsing = false;
	},
	
	handleCommand: function(command, option) {
		// Do
		if (command == 253) {
			switch (option) {
				case 24:	// Terminal type
					this.sendWill(option);
					break;
				default:
					this.sendWont(option);
					break;
			}
		}

		// Will
		if (command == 251) {
			switch (option) {
				case 3:		// Suppress go ahead
				case 5:		// Give status
					this.sendDo(option);
					break;
				default:
					this.sendDont(option);
					break;
			}
		}

		// Subnegotiation
		if (command == 250) {
			option = this.buffer.shift();
			var params = []
			
			var p = this.buffer.shift();
			while (p != 255) {
				params.push(p);
				
				p = this.buffer.shift();
			}
			this.buffer.unshift(p);
			
			
			if (option == 24) {
				if (params[0] == 1) {
					this.socket.writeByte(255);
					this.socket.writeByte(250);
					this.socket.writeByte(option);
					this.socket.writeByte(0);
					this.socket.writeUTFBytes('DEC-VT100');
					this.socket.writeByte(240);
					this.socket.flush();
				}
			}
		}
	},
	
	sendWill: function(option) {
		this.socket.writeByte(255);
		this.socket.writeByte(251);
		this.socket.writeByte(option);
		this.socket.flush();
	},

	sendWont: function(option) {
		this.socket.writeByte(255);
		this.socket.writeByte(252);
		this.socket.writeByte(option);
		this.socket.flush();
	},

	sendDo: function(option) {
		this.socket.writeByte(255);
		this.socket.writeByte(253);
		this.socket.writeByte(option);
		this.socket.flush();
	},

	sendDont: function(option) {
		this.socket.writeByte(255);
		this.socket.writeByte(254);
		this.socket.writeByte(option);
		this.socket.flush();
	},

	close: function() {
		this.connected = false;
		
		this.socket.close;
		this.options.onClose();
	},
	
	write: function(string) {
		for (i = 0; i < string.length; i++) {
//			debug.logData('Sending:', string.charCodeAt(i));
			this.socket.writeByte(string.charCodeAt(i));
		}
		
		this.socket.writeByte(13);
		this.socket.writeByte(10);
		this.socket.flush();
	}
});



TelnetController = Class.create({		
	initialize: function(host, options) {
		this.options = Object.extend({
			onConnect: 	function(){},
			onClose:	function(){}
		}, options || {});
		
		this.waiting = false;
		this.stack = [];

		this.callback = null;
		this.command = '';
		this.id = 0;
		this.data = '';
		
		this.telnet = new TelnetProtocol (host, {
			onConnect: 	this.options.onConnect,
			onClose:	this.options.onClose,
			onData:		this.receiveData.bind(this)
		});
		
		this.ping();
	},
	
	close: function() {
		this.telnet.close();
	},
	
	ping: function() {
		if (!this.waiting && this.stack.length > 0) {
			var request = this.stack.shift();
			
			this.id++;
			this.data = '';
			this.callback = request.callback;
			this.command = request.command;
			
			/* Setup timeout */
			var id = this.id;
			window.setTimeout(function(){
				if (this.id == id && this.waiting) {
					this.waiting = false;
					debug.log('Timeout: No response from NMT within 15 seconds');
				}
			}.bind(this), 15000);

			debug.logData('Sending command to NMT:', this.command);

			this.telnet.write(this.command);
			this.waiting = true;
		}

		window.setTimeout(this.ping.bind(this), 100);
	},

	sendCommand: function(command, callback) {
		debug.log('sendCommand received');
		if (this.telnet.connected) {
			command = typeof command == 'string' ? [command] : command;
			
			for (var i = 0; i < command.length; i++) {
				this.stack.push({
					command: command[i],
					callback: callback
				});
			}
		}
	},
	
	receiveData: function(data) {
		this.data = this.data + data;

		debug.logData('Received chunk from NMT:', data);

		if (this.data.substr(-2) == '# ') {
			var result = this.data;

			debug.log('Data received from NMT complete');
			debug.logData('Unfiltered result:', result);

			// Filter ASCII control codes			
			result = result.replace(/\x20\x08/g, '');

			// Remove echo
			if (result.substr(0, this.command.length) == this.command) {
				result = result.substr(this.command.length);
			}

			// Remove first CR/LF, if present			
			if (result.charCodeAt(0) == 13 && result.charCodeAt(1) == 10) {
				result = result.substr(2);
			}
			
			// Remove prompt
			if (result.substr(-2) == '# ') {
				result = result.substr(0, result.length - 2);
			}
			
			// Filter ANSI control codes
			result = ansi.strip(result);
			
			// Convert string of UTF8 bytes to string of characters
			//if (utf8.detect(result)) {
			//	result = utf8.decode(result);
			//}
			
			debug.logData('Filtered result:', result);

			if (this.stack.length) {
				debug.log('Still ' + this.stack.length + ' commands left...');
			}

			if (this.callback) {
				this.callback(result);
			}

			this.waiting = false;
		}
	}
});





MediatankController = Class.create({
	initialize: function(settings, options) {
		this.options = Object.extend({
			onConnect: 	function(){},
			onClose:	function(){}
		}, options || {});
		
		// Copy the settings to our options, so we can work on them
		// locally without affecting the settingsStore
		settings.extendObject(this.options);
		
		this.usingBusybox = null;
		this.shares = [];
		
		this.telnet = new TelnetController(this.options.address, {
			onConnect:	this.onConnect.bind(this),
			onClose:	this.options.onClose
		});
	},
	
	close: function() {
		this.telnet.close();
	},
	
	onConnect: function() {
		var queue = ['/tmp/busybox26', '/bin/busybox26', '/bin/busybox'];
		if (this.options.busyboxLocation != '') {
			queue.unshift(this.options.busyboxLocation);
		}
		
		this.checkBusybox(queue, this.options.onConnect);
		this.findNetworkShares();
	},
	
	findNetworkShares: function() {
		this.telnet.sendCommand('cat /tmp/setting.txt', function(data) {
			var shares = [ {}, {}, {}, {}, {} ];

			data = data.split("\r\n");
				
			for (i = 0; i < data.length; i++) {
				if (match = /^([^=]*)=(.*)$/.exec(data[i])) {
					var key = match[1];
					var value = match[2];
					
					if (value != '') {
						if (key.substr(0, 8) == 'servlink') {
							var id = parseInt(key.substr(8, 1)) - 1;
							shares[id].link = value;
						}
						
						if (key.substr(0, 8) == 'servname') {
							var id = parseInt(key.substr(8, 1)) - 1;
							shares[id].name = value;
						}
					}
				}
			}
			
			for (var i = 0; i < shares.length; i++) {
				if (shares[i].name && shares[i].link) {
					debug.logData('Found network share:', shares[i].name);

					var mount = shares[i].link + '&smb.name=' + encodeURI(shares[i].name);
					mount = mount.replace(/\&/g, '%26');
					this.shares[shares[i].name] = '/opt/sybhttpd/default/smbclient.cgi smb.cmd=mount%26smb.opt=' + mount + ' > /dev/null 2>&1';
				}
			}
		}.bind(this));
	},
	
	checkBusybox: function(queue, callback) {
		var busybox = queue.shift();
		
		this.telnet.sendCommand(busybox, function(busybox, data) {
			if (match = /BusyBox v(.*) \(/.exec(data)) {
				var supported = /, nohup,/.test(data)	
				debug.logData("Found Busybox (" + match[1] + ") at " + busybox + ", nohup is " + (supported ? 'supported': 'not supported'));
				
				if (!supported) {
					if (queue.length) {
						this.checkBusybox(queue, callback);
					}
				} else {
					this.usingBusybox = busybox;
					callback();
				}
			} else {
				debug.log("Did not find Busybox at " + busybox);
				if (queue.length) {
					this.checkBusybox(queue, callback);
				}
			}
			
			this.options.onConnect();
		}.bind(this, busybox));
	},
	
	busyboxInstalled: function(callback) {
		if (this.usingBusybox == null) {
			this.telnet.sendCommand("cd /tmp ;[ -f /tmp/busybox26 ] || wget http://mediatankcontroller.com/repository/air/busybox/busybox26", function(){
				this.telnet.sendCommand("chmod a+x /tmp/busybox26");
				this.usingBusybox = '/tmp/busybox26';
				debug.log('Installed busybox26 on your NMT...');
				callback();
			}.bind(this));
			return false;
		}
		return true;
	},
	
	playQueue: function(queue) {
		if (!this.busyboxInstalled(this.playQueue.bind(this, queue))) {
			return;
		}
			
		var nohup = this.usingBusybox ? this.usingBusybox + ' nohup ' : '';

		var playlist = '';
		for (var i = 0; i < queue.length; i++) {
			playlist += queue[i].name + "|0|0|" + queue[i].path + "|";
		}
		playlist = playlist.replace(/([\"`])/g, "\\$1");

		this.telnet.sendCommand([
			"echo 212 > /tmp/irkey",
			"sleep 1",
			"killall mono",
			"killall pod",
			"killall gaya",
			"killall amp_test",
			"sleep 1",
			"echo \"" + playlist + "\" > /tmp/playlist.htm",
			"echo 'mono -audio -bgimg -playlist file:///tmp/playlist.htm -dram 1 > /dev/null 2>&1' > /tmp/runmono",
			"echo 'gaya " + this.options.gayaHome + " > /dev/null 2>&1' >> /tmp/runmono",
			nohup + "sh /tmp/runmono > /dev/null 2>&1 &"
		]);
		
	},
	
	playFile: function(path, type) {
		if (!this.busyboxInstalled(this.playFile.bind(this, path, type))) {
			return;
		}
			
		var nohup = this.usingBusybox ? this.usingBusybox + ' nohup ' : '';
		
		path = path.replace(/([^\w:.,-\/])/g, "\\$1");
		switch(type) {
			case 'dvd':
				var command = "amp_test " + path + " --dfb:quiet -osd32 -bgnd:/bin/logo.jpg";
				break;
			case 'audio':
				var command = "mono -audio -prebuf 100 -bgimg -single " + path + " -dram 1";
				break;
			default:
				var command = "mono -nogui -single " + path + " -dram 1";
				break;
		}
		
		command = command.replace(/([\"`])/g, "\\$1");
		this.telnet.sendCommand([
			"echo 212 > /tmp/irkey",
			"sleep 1",
			"killall mono",
			"killall pod",
			"killall gaya",
			"killall amp_test",
			"sleep 1",
			"echo \"" + command + " > /dev/null 2>&1\" > /tmp/runmono",
			"echo 'gaya " + this.options.gayaHome + " > /dev/null 2>&1' >> /tmp/runmono", 
			nohup + "sh /tmp/runmono > /dev/null 2>&1 &"
		]);
	},
	
	showPage: function(path) {
		if (!this.busyboxInstalled(this.playFile.bind(this, path))) {
			return;
		}
			
		var nohup = this.usingBusybox ? this.usingBusybox + ' nohup ' : '';
		
		path = path.replace(/([^\w:.,-\/])/g, "\\$1");
		var command = "[ -n \"`ps | grep -v grep | grep 'gaya'`\" ] && echo " + path + " > /tmp/gaya_bc || gaya " + path;
		command = command.replace(/([\"`])/g, "\\$1");
		
		this.telnet.sendCommand([
			"echo 212 > /tmp/irkey",
			"sleep 1",
			"killall mono",
			"killall pod",
			"killall amp_test",
			"sleep 2",
			"echo \"" + command + " > /dev/null 2>&1\" > /tmp/runmono",
			nohup + "sh /tmp/runmono > /dev/null 2>&1 &"
		]);
	},
	
	getDirectory: function(directory, callback) {
		if (this.options.jukeboxConnector == '') {
			var commands = [];
			
			debug.logData('Checking if network share:', directory);
			
			if (share = /\/NETWORK_SHARE\/([^\/]*)\/$/.exec(directory)) {
				debug.log('Suspect network share!');
				
				if (this.shares[share[1]]) {
					debug.log('Found network share!');
					commands.push(this.shares[share[1]]);
				}
			}
			
			commands.push("[ -n \"`ls --color=never 2>&1 | grep unrecognized`\" ] && ls -l \"" + directory + "\" || ls --color=never -l \"" + directory + "\"");
			this.telnet.sendCommand(commands, function(data){
				data = data.split("\r\n")
				
				var reLarge = /^([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+(?:[a-z]+\s+[0-9]+\s+[0-9][0-9]\:?[0-9][0-9]\s+)([^\s].*)$/i;
				var reSmall = /^([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s].*)$/;
				var list = [];
				
				for (i = 0; i < data.length; i++) {
					var item = reLarge.exec(data[i]);
					if (!item) {
						item = reSmall.exec(data[i]);
					}
					
					if (item) {
						var type = item[1].substr(0, 1) == 'd' ? 'directory' : 'file';
						var name = item[6];
						
						if (item[1].substr(0,1) == 'l') {
							name = name.substr(0, name.lastIndexOf(" -> "));
							type = 'directory';
						}	
											
						list.push({
							'name': name,
							'path': directory + name,
							'type': type
						});
					}
				}
				
				callback(list);
			}.bind(this));
		} else {
			directory = directory.replace(/ /g, "\\ ");
			
			if (this.options.jukeboxConnector.substr(-1) == '/') {
				directory = directory.substr(0, -1);
				directory = directory.replace('/', '-');
				
				var command = 'cat ' + this.options.jukeboxConnector + 'contents' + directory + '.txt';
			} else {
				var command = this.options.jukeboxConnector + ' ' + directory;
			}
			
			this.telnet.sendCommand(command, function(data){
				data = data.split("\r\n")
				
				var fre = /^f name=(.*) path=(.*)$/
				var dre = /^d name=(.*) id=(.*)$/

				var list = [];
				
				for (i = 0; i < data.length; i++) {
					var item = fre.exec(data[i]);
					if (item) {
						list.push({
							'name': item[1],
							'path': item[2],
							'type': 'file'
						});
					}

					var item = dre.exec(data[i]);
					if (item) {
						list.push({
							'name': item[1],
							'path': directory + item[2],
							'type': 'directory'
						});
					}
				}
				
				callback(list);
			}.bind(this));
		}
	},
	
	sendKeyCode: function(keyCode) {
		this.telnet.sendCommand("echo " + keyCode + " > /tmp/irkey", null);
	},
	
	play: function() {
		this.sendKeyCode(0xE9);
	},

	pause: function() {
		this.sendKeyCode(0xEA);
	},

	stop: function() {
		this.sendKeyCode(0x1B);
	},

	up: function() {
		this.sendKeyCode(0xA8);
	},

	down: function() {
		this.sendKeyCode(0xA9);
	},

	left: function() {
		this.sendKeyCode(0xAA);
	},

	right: function() {
		this.sendKeyCode(0xAB);
	},

	ok: function() {
		this.sendKeyCode(0x0D);
	},

	back: function() {
		this.sendKeyCode(0x8D);
	},

	menu: function() {
		this.sendKeyCode(0x09);
	},

	home: function() {
		this.sendKeyCode(0xD0);
	},

	rewind: function() {
		this.sendKeyCode(0xD5);
	},

	forward: function() {
		this.sendKeyCode(0xD6);
	},

	previous: function() {
		this.sendKeyCode(0xDB);
	},

	next: function() {
		this.sendKeyCode(0xDC);
	},

	subtitle: function() {
		this.sendKeyCode(0xEB);
	},

	audio: function() {
		this.sendKeyCode(0xD8);
	},

	info: function() {
		this.sendKeyCode(0x95);
	},

	setup: function() {
		this.sendKeyCode(0x8C);
	},

	menu: function() {
		this.sendKeyCode(0x09);
	},

	source: function() {
		this.sendKeyCode(0xDD);
	},

	power: function() {
		this.sendKeyCode(0xD2);
	},

	red: function() {
		this.sendKeyCode(0xDE);
	},

	green: function() {
		this.sendKeyCode(0xDF);
	},

	yellow: function() {
		this.sendKeyCode(0xE0);
	},

	blue: function() {
		this.sendKeyCode(0xE2);
	},

	del: function() {
		this.sendKeyCode(0x08);
	},

	caps: function() {
		this.sendKeyCode(0xFC);
	},

	timeseek: function() {
		this.sendKeyCode(0x91);
	},

	zoom: function() {
		this.sendKeyCode(0xDA);
	},

	repeat: function() {
		this.sendKeyCode(0x90);
	},

	angle: function() {
		this.sendKeyCode(0xEC);
	},

	tvmode: function() {
		this.sendKeyCode(0x8F);
	},

	eject: function() {
		this.sendKeyCode(0xEF);
	},

	volumeup: function() {
		this.sendKeyCode(0x9E);
	},

	volumedown: function() {
		this.sendKeyCode(0x9F);
	},

	number: function(digit) {
		this.sendKeyCode(0xF1 + digit);
	},
	
	shortcut: function(choice) {
		switch(choice) {
			case 1:	var type = this.options.shortcutOneType;
					var location = this.options.shortcutOneLocation;
					break;
			case 2:	var type = this.options.shortcutTwoType;
					var location = this.options.shortcutTwoLocation;
					break;
			case 3:	var type = this.options.shortcutThreeType;
					var location = this.options.shortcutThreeLocation;
					break;
			case 4:	var type = this.options.shortcutFourType;
					var location = this.options.shortcutFourLocation;
					break;
		}

		if (location != 'http://' && location != '') {
			if (type == 'web') {
				this.showPage(location);
			}
			else {
				this.playFile(location, type);
			}
		}
	}
});




var ansi = {
	strip: function(string) {
		var ansi = [
			/\x1b\x5b0m/g,
			/\x1b\x5b0;0m/g,
			/\x1b\x5b0;3[0-7]m/g,
			/\x1b\x5b1;3[0-7]m/g,
			/\x1b\x5b4[0-7]m/g,
			/\x1b\x5b[5-6]m/g,

    		/\x1b\x5b\d+A/g,
     		/\x1b\x5b\d+B/g,
     		/\x1b\x5b\d+C/g,
     		/\x1b\x5b\d+D/g,
   			/\x1b\x5bK/g,
     		/\x1bD/g,
     		/\x1bM/g,
     		/\x1b7/g,
     		/\x1b8/g,
			/\x1b\x233/g,
    		/\x1b\x234/g,
			/\x1b\x235/g,
			/\x1b\x236/g, 
			/\x1b\x5b\d+\x3b[01457]+m/g,
			/\x1b\x5b\d+\x3b\d+[fH]/g,
			/\x1b\x5b0K/g,
			/\x1b\x5b1/g,
			/\x1b\x5b2K/g,
			/\x1b\x5bJ/g,
			/\x1b\x5b0J/g,
			/\x1b\x5b2J/g,
			/\x1b\x5b\d\x3b[01234]+q/g,
			/\x1b[\x28\x29]A/g,
			/\x1b[\x28\x29]B/g,
			/\x1b[\x28\x29]0/g,
			/\x1b[\x28\x29]1/g,
			/\x1b[\x28\x29]2/g,
			/\x1bK\d+\x38\d+r/g,
			/\x1bH/g,
			/\x1b\x5bg/g,
			/\x1b\x5b0g/g,
			/\x1b\x5b3g/g,
			/\x1b\x5b20h/g,
			/\x1b\x5b20l/g,
			/\x1b\x5b\x3f1h/g,
			/\x1b\x5b\x3f1l/g,
			/\x1b\x5b\x3f2l/g,
			/\x1b\x5b\x3f3h/g,
			/\x1b\x5b\x3f3l/g,
			/\x1b\x5b\x3f4h/g,
			/\x1b\x5b\x3f4l/g,
			/\x1b\x5b\x3f5h/g,
			/\x1b\x5b\x3f5l/g,
			/\x1b\x5b\x3f6h/g,
			/\x1b\x5b\x3f6l/g,
			/\x1b\x5b\x3f7h/g,
			/\x1b\x5b\x3f7l/g,
			/\x1b\x5b\x3f8h/g,
			/\x1b\x5b\x3f8l/g,
			/\x1b\x5b\x3f9h/g,
			/\x1b\x5b\x3f9l/g,
			/\x1b\x5b6n/g,
			/\x1b\x5b\d+\x3b(\d+)R/g,
			/\x1b\x5b5n/g,
			/\x1b\x5bc/g,
			/\x1b\x5b0c/g,
			/\x1b\x5bc/g,
			/\x1b\x5b0c/g,
			/\x1b\x5b\x3f1\x3b[0-7]c/g,
			/\x1bc/g,
			/\x1b\x238/g,
			/\x1b\x5b2\x3b\d{1,3}y/g,
			/\x1bA/g,
			/\x1bB/g,
    		/\x1b[A-DF-KZ12<>=]/g,
    		/\x1bA[\x3e\x3d\x3c]/g,
    		/\x1bY[\000-\377]{2}/g
		];
		
		for (var i = 0; i < ansi.length; i++) {
			string = string.replace(ansi[i], '');
		}
		
		return string;
	}
}

var utf8 = {
	detect: function (string) {
		var m = 0;
		
		for (i = 0; i < string.length; i++) {
			var c = string.charCodeAt(i);
			
			var n = 0;
			
			if (c < 128) {
				n = 0;
			}
			else if ((c & 224) == 192) {
				n = 1;
			}
			else if ((c & 240) == 224) {
				n = 2;
			}
			else if ((c & 248) == 240) {
				n = 3;
			}
			else {
				// Not a valid UTF-8 stream... maybe ISO-8859-1
				return false;
			}
			
			m = Math.max(m, n);

			for (var j = 0; j < n; j++) {
				i++;
				
				c = string.charCodeAt(i);
				
   				if ((i == string.length || (c & 192) != 128)) {
					// Not a valid UTF-8 stream... maybe ISO-8859-1
					return false;
				}
  			}
 		}

		if (m == 0) {
			// Only the 7-bit ASCII subset of UTF-8 is used...
			return false;	
		}
		
		// Valid UTF-8 stream
		return true;
	},
	
    encode : function (string) {
 
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
 
        }
 
        return utftext;
    },
 
    decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
 
        while ( i < utftext.length ) {
 
            c = utftext.charCodeAt(i);
 
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
 
        }
 
        return string;
    }
 }
