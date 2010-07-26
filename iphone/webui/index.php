<?php

	// MediatankController for iPhone 
	// Version 1.0 beta 2
	// Copyright 2009, Niels Leenheer

	// Start by going to the following url in Safari on your iPhone:
	// http://IP-OF-YOUR-NMT:9999/MediatankController_web/

	$config  = parse_ini_file(dirname(dirname(__FILE__)) . "/config.ini", true);
	
	set_time_limit(0);

	include ("defaults.php");
	include ("libraries/elevate.php");
	include ("libraries/mediatypes.php");
	include ("libraries/template.php");




	/* Backwards compatibility */
	if ($_GET['action'] == 'file') {
		$_GET['action'] == 'play';
	}

	switch ($_GET['action']) {
		case 'version':
			if ($debug) {
				echo json_encode("debug");
			} else {
				echo json_encode($version);
			}
			
			break;
			
		case 'ping':
			echo json_encode(true);
			break;
	
		case 'sendCommand':
			if ($_GET['command'] == 'custom' && isset($_GET['key'])) {
				sendKeyCode($_GET['key']);
				break;
			}
		
			sendCommand($_GET['command']);
			break;
			
		case 'play': 
			if (isset($_GET['file'])) {
				$file = $_GET['file'];
			}

			if (isset($_GET['files'])) {
				$files = $_GET['files'];
			}

			if (isset($_GET['directory'])) {
				$directory = $_GET['directory'];
			}
			
			if (isset($_GET['service'])) {
				$service = $_GET['service'];
			}
			
			if ($root && $normal) {
				$root = false;
			}

			if ($root) {
				if (isset($file)) {
					playFile($file);
				}
				
				if (isset($files)) {
					playFiles($files);
				}
				
				if (isset($directory)) {
					playAllMusic($directory);
				}

				if (isset($service)) {
					startService($service);
				}
				
				returnToNormal();
			} 
			
			if ($normal) {
				elevateToRoot(true);
			}
			
			break;
			
			
		case 'retrieve':
			if (!isset($_GET['id']) || $_GET['id'] == '') {
				break;
			}
			
			if ($_GET['id'] == 'home') {
				$directory = $config['mediaLocation'];
	
				if ($root && $normal) {
					if (isNetworkShare($directory)) {
						$root = false;
					}
				}
				
				if ($root) {
					$files = getDirectory($directory);
					$network = getDirectory($directory . "NETWORK_SHARE/");
					$upnp = getUpnpServers($directory);
					
					$files['files'] = array_merge($files['files'], $network['files'], $upnp);
					$files['files'][] = array(
						"name" => "Web Services",
						"type" => "dir",
						"icon" => "service",
						"id" => "services",
					);
	
					returnToNormal($files);
				} 
				
				if ($normal) {
					if (isset($config['jukeboxConnector'])) {
						$directory = '/';
						$files = getConnector($directory);
						$type = 'connector';
					} else {
						$files = elevateToRoot();
						$type = 'filesystem';
					}
					
					$files['id'] = 'home';
					$files['path'] = $directory;
					$files['type'] = $type;
					$files['title'] = 'Contents';
	
					while (list($k,) = each($files['files'])) {
						if ($files['files'][$k]['type'] == 'dir') {
							if (!isset($files['files'][$k]['id'])) {
								$files['files'][$k]['path'] .= '/';
								$files['files'][$k]['id'] = $type . '_' . base64_encode($files['files'][$k]['path']);
							}
						}
					}
	
					if (isset($config['jukeboxConnector']) && $config['showFilesystem']) {
						$files['files'][] = array(
							"name" => "Browse the filesystem",
							"path" => "/opt/sybhttpd/localhost.drives/",
							"type" => "root",
							"icon" => "hd",
							"id" => 'filesystem_' . base64_encode("/opt/sybhttpd/localhost.drives/"),
						);
					}
	
					echo json_encode($files);
				}
				
				break;
			} 
			
			
			if ($_GET['id'] == 'services') {
				$files['id'] = 'services';
				$files['title'] = 'Web Services';
				
				if (isset($config['jukeboxConnector'])) {
					$files['parent'] = 'filesystem_' . base64_encode($config['mediaLocation']);
				} else {
					$files['parent'] = 'home';
				}
				
				
				$files['files'][] = array(
					"name" => "Media Service Portal",
					"type" => "service",
					"icon" => "service",
					"path" => "http://www.mspportal.com/nmt/"
				);
	
				$files['files'][] = array(
					"name" => "MSP Community",
					"type" => "service",
					"icon" => "service",
					"path" => "http://www.mspportal.com/community/"
				);
				
				$files['files'] = array_merge($files['files'], getServices());
				echo json_encode($files);
				break;
			}

			list($type, $directory) = explode('_', $_GET['id']);
			$directory = base64_decode($directory);
			
			if ($root && $normal) {
				if (isNetworkShare($directory)) {
					$root = false;
				}
			}
			
			if ($root) {
				if ($type == 'filesystem') {
					if ($directory == $config['mediaLocation']) {
						$files = getDirectory($directory);
						$network = getDirectory($directory . "NETWORK_SHARE/");
						$upnp = getUpnpServers($directory);
					
						$files['files'] = array_merge($files['files'], $network['files'], $upnp);
						$files['files'][] = array(
							"name" => "Web Services",
							"type" => "dir",
							"icon" => "service",
							"id" => 'services',
						);
					} else {
						$files = getDirectory($directory);
					}
				}
				
				returnToNormal($files);
			} 
			
			if ($normal) {
				switch($type) {
					case 'connector':
						if (isset($config['jukeboxConnector'])) {
							$files = getConnector($directory);
						} else {
							$files = array();
						}
						break;
					
					case 'upnp':
						$files = getUpnpPath($directory);
						break;
						
					default:
						$files = elevateToRoot();
						break;
				}

				$files['id'] = $type . '_' . base64_encode($directory);
				$files['type'] = $type;
				
				if ($type != 'upnp') {
					$files['path'] = $directory;
					$files['parent'] = $type . '_' . base64_encode(dirname($directory) . '/');
				}

				if (isset($config['jukeboxConnector'])) {
					if ($type == 'connector' && dirname($directory) == '/') {
						$files['parent'] = 'home';
					}
					
					if ($type == 'filesystem' && $directory == $config['mediaLocation']) {
						$files['parent'] = 'home';
						$files['title'] = 'Filesystem';
					}
				} else {
					if (dirname($directory) . '/' == $config['mediaLocation']) {
						$files['parent'] = 'home';
					}
				}
				
				if (dirname($directory) == '/opt/sybhttpd/localhost.drives/NETWORK_SHARE') {
					$files['parent'] = $type . '_' . base64_encode(dirname(dirname($directory)) . '/');
				}
				
				while (list($k,) = each($files['files'])) {
					if ($files['files'][$k]['type'] == 'dir') {
						if (!isset($files['files'][$k]['id'])) {
							$files['files'][$k]['path'] .= '/';
							$files['files'][$k]['id'] = $type . '_' . base64_encode($files['files'][$k]['path']);
						}
					} else {
						if (!isset($files['files'][$k]['id'])) {
							$files['files'][$k]['id'] = $type . '_' . base64_encode($files['files'][$k]['path']);
						}
					}
				}
				
				echo json_encode($files);
			}
			
			break;


		case 'watchfolder':
			$dbHandle = new PDO('sqlite:../controller.sqlite3');
			$dbHandle->exec('PRAGMA temp_store=2');
				
			$dbHandle->exec('CREATE TABLE IF NOT EXISTS watchlist (path text PRIMARY KEY, stale int(11), firstseen int(11), lastseen int(11))');

			if (isset($_GET['command']) && $_GET['command'] == 'unmark') {
				$update = $dbHandle->prepare('UPDATE watchlist SET stale=? WHERE path=?');
				$update->execute(array(0, $_GET['file']));
				exit;
			}
			
			if (isset($_GET['command']) && $_GET['command'] == 'mark') {
				if ($_GET['file'] == '*') {
					$update = $dbHandle->prepare('UPDATE watchlist SET stale=?');
					$update->execute(array(1));
				} else {
					$update = $dbHandle->prepare('UPDATE watchlist SET stale=? WHERE path=?');
					$update->execute(array(1, $_GET['file']));
				}
				
				exit;
			}
			
			if (isset($_GET['command']) && $_GET['command'] == 'removeMarked') {
				$update = $dbHandle->prepare('UPDATE watchlist SET stale=? WHERE stale=?');
				$update->execute(array(2, 1));
				exit;
			}



			$directory = $_GET['directory'];
			
			if ($root && $normal) {
				if (isNetworkShare($directory)) {
					$root = false;
				}
			}
			
			if ($root) {
				$files = getFilesFromWatchfolder($directory);
				returnToNormal($files);
			} 
			
			if ($normal) {
				$files = elevateToRoot();
				$timestamp = time();
				
				if (isset($_GET['reset'])) {
					$delete = $dbHandle->prepare('DELETE FROM watchlist');
					$delete->execute();
				}
				
				while (list(,$file) = each($files)) {
						$update = $dbHandle->prepare('UPDATE watchlist SET lastseen=? WHERE path=?');
						$update->execute(array($timestamp, $file));
						
						if (!$update->rowCount()) {
							$insert = $dbHandle->prepare('INSERT INTO watchlist (path,stale,firstseen,lastseen) VALUES (?,?,?,?)');
							$insert->execute(array($file, 0, $timestamp, $timestamp));
						}
				}
				
				$delete = $dbHandle->prepare('DELETE FROM watchlist WHERE lastseen != ?');
				$delete->execute(array($timestamp));
				
				$select = $dbHandle->prepare('SELECT path, stale FROM watchlist WHERE stale < 2 ORDER BY firstseen DESC');
				$select->execute();
				
				$result = $select->fetchAll();
				$files = array();
				
				while (list(,$row) = each($result)) {
					$file = array (
						'name' 	=> basename($row['path']),
						'path' 	=> $row['path'],
						'id' 		=> 'filesystem_' . base64_encode($row['path']),
						'type' 	=> 'file',
						'state' => intval($row['stale'])
					);
					
					switch(true) {
						case MediaTypes::isDVD($file['name']):
						case MediaTypes::isVideo($file['name']):
							$file['icon'] = 'video';
							break;
						case MediaTypes::isAudio($file['name']):
							$file['icon'] = 'audio';
							break;
						case MediaTypes::isPlaylist($file['name']):
							$file['icon'] = 'playlist';
							break;
					}
					
					$files[] = $file;
				}
				
				unset($result);
				echo json_encode($files);
			}
			
			break;
			
		default:
			header ("Location: themes/" . $config['template'] . "/index.html");
			exit;
			break;
	}
	
	
	
	
	
	
	
	
	
	
	function startService($service) {
		exec("echo 212 > /tmp/irkey");
		exec("sleep 2");
		
		exec("killall amp_test");
		exec("killall mono");
		exec("killall pod");
		exec("echo " . $service . " > /tmp/gaya_bc");
	}
	
	function playFile($file) {
		mountNetworkShare($file);
		
		switch(true) {
			case MediaTypes::isPlaylist(basename($file)):
				$options = "pod='2,,'";
				break;
			case MediaTypes::isDVD(basename($file)):
				$options = "ZCD=2";
				break;
			case MediaTypes::isVideo(basename($file)):
				$options = "vod";
				break;
			case MediaTypes::isAudio(basename($file)):
				$options = "aod";
				break;
		}
		
		if (substr($file, -16) == 'action=playvideo') {
			$options="vod=playlist";
		}
		
		if (substr($file, -15) == 'action=playsong') {
			$options="aod=playlist";
		}
		
		$file = htmlspecialchars($file, ENT_QUOTES);
		
		if ($fp = fopen('/tmp/runmono.html', 'w')) {
			fwrite($fp, "<body bgcolor=black link=black onloadset='go'>");
			fwrite($fp, "<a onfocusload name='go' href='file://{$file}' {$options}></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='home'></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='source'></a>");
			fwrite($fp, "<br><font size='6' color='#ffffff'><b>Press Return on your remote to go back to your previous location</b></font>");
			fclose($fp);
		}

		exec("echo 212 > /tmp/irkey");
		exec("sleep 2");
		
		exec("killall amp_test");
		exec("killall mono");
		exec("killall pod");
		exec("echo /tmp/runmono.html > /tmp/gaya_bc");
	}
	
	function playFiles($files) {
		if ($fp = fopen('/tmp/runmono.jsp', 'w')) {
			while (list($name,$file) = each($files)) {
				if (substr($file, 0, 1) == '/') {
					$file = 'file://' . $file;
				}
				
				fwrite($fp, $name . "|0|0|" . $file . "|\n");
			}		

			fclose($fp);
		}
		
		$file = '/tmp/runmono.jsp';
		$options = "pod='2,,'";
		
		if ($fp = fopen('/tmp/runmono.html', 'w')) {
			fwrite($fp, "<body bgcolor=black link=black onloadset='go'>");
			fwrite($fp, "<a onfocusload name='go' href='file://{$file}' {$options}></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='home'></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='source'></a>");
			fwrite($fp, "<br><font size='6' color='#ffffff'><b>Press Return on your remote to go back to your previous location</b></font>");
			fclose($fp);
		}

		exec("echo 212 > /tmp/irkey");
		exec("sleep 2");
			
		exec("killall amp_test");
		exec("killall mono");
		exec("killall pod");
		exec("echo /tmp/runmono.html > /tmp/gaya_bc");
	}

	function playAllMusic($directory) {
		mountNetworkShare($directory);
		$files = getDirectory($directory);
		
		if ($fp = fopen('/tmp/runmono.jsp', 'w')) {
			while (list(,$file) = each($files['files'])) {
				if ($file['icon'] == 'audio') {
					fwrite($fp, $file['name'] . "|0|0|file://" . $file['path'] . "|\n");
				}
			}		

			fclose($fp);
		}
		
		$file = '/tmp/runmono.jsp';
		$options = "pod='2,,'";
		
		if ($fp = fopen('/tmp/runmono.html', 'w')) {
			fwrite($fp, "<body bgcolor=black link=black onloadset='go'>");
			fwrite($fp, "<a onfocusload name='go' href='file://{$file}' {$options}></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='home'></a>");
			fwrite($fp, "<a href='http://127.0.0.1:8883/start.cgi?list' tvid='source'></a>");
			fwrite($fp, "<br><font size='6' color='#ffffff'><b>Press Return on your remote to go back to your previous location</b></font>");
			fclose($fp);
		}

		exec("echo 212 > /tmp/irkey");
		exec("sleep 2");
			
		exec("killall amp_test");
		exec("killall mono");
		exec("killall pod");
		exec("echo /tmp/runmono.html > /tmp/gaya_bc");
	}
	
	
	
	function sendCommand($command) {
		switch($command) {
			case 'nav_left':	exec ('echo $((0xAA)) > /tmp/irkey');	break;
			case 'nav_right':	exec ('echo $((0xAB)) > /tmp/irkey');	break;
			case 'nav_up':		exec ('echo $((0xA8)) > /tmp/irkey');	break;
			case 'nav_down':	exec ('echo $((0xA9)) > /tmp/irkey');	break;
			case 'nav_ok':		exec ('echo $((0x0D)) > /tmp/irkey');	break;

			case 'play':		exec ('echo $((0xE9)) > /tmp/irkey');	break;
			case 'pause':		exec ('echo $((0xEA)) > /tmp/irkey');	break;
			case 'slow':		exec ('echo $((0xD9)) > /tmp/irkey');	break;
			case 'stop':		exec ('echo $((0x1B)) > /tmp/irkey');	break;
			case 'rew':			exec ('echo $((0xD5)) > /tmp/irkey');	break;
			case 'fwd':			exec ('echo $((0xD6)) > /tmp/irkey');	break;
			case 'prev':		exec ('echo $((0xDB)) > /tmp/irkey');	break;
			case 'next':		exec ('echo $((0xDC)) > /tmp/irkey');	break;

			case 'back':		exec ('echo $((0x8D)) > /tmp/irkey');	break;
			case 'home':		exec ('echo $((0xD0)) > /tmp/irkey');	break;
			case 'info':		exec ('echo $((0x95)) > /tmp/irkey');	break;
			case 'zoom':		exec ('echo $((0xDA)) > /tmp/irkey');	break;

			case 'volume_up':	exec ('echo $((0x9E)) > /tmp/irkey');	break;
			case 'volume_down':	exec ('echo $((0x9F)) > /tmp/irkey');	break;
			case 'volume_mute':	exec ('echo $((0xE1)) > /tmp/irkey');	break;

			case 'page_up':		exec ('echo $((0x9E)) > /tmp/irkey');	break;
			case 'page_down':	exec ('echo $((0x9F)) > /tmp/irkey');	break;

			case 'num_0':		exec ('echo $((0xF1)) > /tmp/irkey');	break;
			case 'num_1':		exec ('echo $((0xF2)) > /tmp/irkey');	break;
			case 'num_2':		exec ('echo $((0xF3)) > /tmp/irkey');	break;
			case 'num_3':		exec ('echo $((0xF4)) > /tmp/irkey');	break;
			case 'num_4':		exec ('echo $((0xF5)) > /tmp/irkey');	break;
			case 'num_5':		exec ('echo $((0xF6)) > /tmp/irkey');	break;
			case 'num_6':		exec ('echo $((0xF7)) > /tmp/irkey');	break;
			case 'num_7':		exec ('echo $((0xF8)) > /tmp/irkey');	break;
			case 'num_8':		exec ('echo $((0xF9)) > /tmp/irkey');	break;
			case 'num_9':		exec ('echo $((0xFA)) > /tmp/irkey');	break;

			case 'menu':		exec ('echo $((0x09)) > /tmp/irkey');	break;
			case 'subtitle':	exec ('echo $((0xEB)) > /tmp/irkey');	break;
			case 'audio':		exec ('echo $((0xD8)) > /tmp/irkey');	break;
			case 'setup':		exec ('echo $((0x8C)) > /tmp/irkey');	break;
			case 'source':		exec ('echo $((0xDD)) > /tmp/irkey');	break;
			case 'power':		exec ('echo $((0xD2)) > /tmp/irkey');	break;
			case 'red':			exec ('echo $((0xDE)) > /tmp/irkey');	break;
			case 'green':		exec ('echo $((0xDF)) > /tmp/irkey');	break;
			case 'yellow':		exec ('echo $((0xE0)) > /tmp/irkey');	break;
			case 'blue':		exec ('echo $((0xE2)) > /tmp/irkey');	break;
			case 'del':			exec ('echo $((0x08)) > /tmp/irkey');	break;
			case 'caps':		exec ('echo $((0xFC)) > /tmp/irkey');	break;
			case 'timeseek':	exec ('echo $((0x91)) > /tmp/irkey');	break;
			case 'repeat':		exec ('echo $((0x90)) > /tmp/irkey');	break;
			case 'angle':		exec ('echo $((0xEC)) > /tmp/irkey');	break;
			case 'tv_mode':		exec ('echo $((0x8F)) > /tmp/irkey');	break;
			case 'eject':		exec ('echo $((0xEF)) > /tmp/irkey');	break;
			case 'title':		exec ('echo $((0x94)) > /tmp/irkey');	break;
		}
	}
	
	function sendKeyCode($key) {
		exec ('echo ' . intval($key) . ' > /tmp/irkey');
	}


	function filterFile($file) {
		if (MediaTypes::isVisible($file['name'])) {
			if ($file['type'] == 'dir') {
				$file['type'] = 'file';
			}
					
			switch(true) {
				case MediaTypes::isDVD($file['name']):
				case MediaTypes::isVideo($file['name']):
					$file['icon'] = 'video';
					break;
				case MediaTypes::isAudio($file['name']):
					$file['icon'] = 'audio';
					break;
				case MediaTypes::isPlaylist($file['name']):
					$file['icon'] = 'playlist';
					break;
			}
					
			return $file;
		}

		if ($file['type'] == 'dir' && !MediaTypes::isHidden($file['name'])) {
			$file['icon'] = 'folder';
			
			if ($file['name'] == 'HARD_DISK' || $file['name'] == 'SATA_DISK') {
				$file['icon'] = 'hd';
			}
			
			if (substr($file['name'], 0, 9) == 'USB_DRIVE') {
				$file['icon'] = 'usb';
			}
			
			if (basename(dirname($file['path'])) == 'NETWORK_SHARE') {
				$file['icon'] = 'network';
			}

			return $file;
		}
	}

	function isNetworkShare($directory) {
		return (substr($directory, 0, 45) == '/opt/sybhttpd/localhost.drives/NETWORK_SHARE/');
	}

	function mountNetworkShare($directory) {
		if (isNetworkShare($directory)) {
			$share = substr($directory, 45);
			
			if ($share) {
				if (substr($share, -1) == '/') {
					$share = substr($share, 0, -1);
				}
			
				$share = explode('/', $share);
				
				if (count($share) == 1 || (count($share) > 1 && !file_exists($directory))) {
					$settings = file_get_contents('/tmp/setting.txt');
					
					if (preg_match("/servname([0-9])\=" . $share[0] . "/", $settings, $matches)) {
						preg_match("/servlink" . $matches[1] . "\=(.*)&smb.user=(.*)&smb.passwd=(.*)/", $settings, $link);
						
						$options = array();
						$options[] = "smb.cmd=mount";
						$options[] = "smb.opt=" . rawurlencode($link[1]);
						$options[] = "smb.user=" . rawurlencode($link[2]);
						$options[] = "smb.passwd=" . rawurlencode($link[3]);
						$options[] = "smb.name=" . rawurlencode($share[0]);
						
						exec('/opt/sybhttpd/default/smbclient.cgi ' . implode('%26', $options) . ' > /dev/null 2>&1');
					}
				}
			}
		}
	}
	
	function readDirectory($directory) {
		$files = array();
	
		if (is_dir($directory)) {
			if ($dh = opendir($directory)) {
				while (($f = readdir($dh)) !== false) {
					switch (substr(exec("ls -dl \"" . str_replace('"', '\"', $directory . $f) . "\""), 0, 1)) {
						case '-':	$type = 'file'; break;
						case 'd':	$type = 'dir'; break;
						case 'c':	$type = 'char'; break;
						case 'b':	$type = 'block'; break;
						case 'l':	$type = 'link'; break;
						default:	$type = 'unknown'; break;
					}
					
					$file = array(
						'name'	=>	$f,
						'path'  =>  $directory . $f,
						'type'	=>	$type,
						'icon'  =>  ''
					);
					
					if ($file = filterFile($file)) {
						$files[] = $file;
					}
				}
				closedir($dh);
			}
		}
		
	    usort($files, "naturalSortByName"); 
    
		return array(
			'title' => basename($directory),
			'directory' => $directory,
			'files' => $files
		);
	}
	
	function getFilesFromWatchfolder($directory) {
		mountNetworkShare($directory);
		
		$files = array();
		$base = '';
		
		$directory = substr($directory, 0, -1);
		exec("ls -1R {$directory}", $output);
		while (list(,$line) = each($output)) {
			if (substr($line, -1) == ':') {
				$base = substr($line, 0, -1);
				
				if (MediaTypes::isVisible($base)) {
					$files[] = $base;
				}
			} else if ($line != '') {
				$file = $base . '/' . $line;
				
				if (MediaTypes::isVisible($file)) {
					$files[] = $file;
				}
			}
		}
		
		return $files;		
	}

	function getDirectory($directory) {
		mountNetworkShare($directory);
		return readDirectory($directory);
	}

	function getConnector($directory) {
		global $config; 
		
		$files = array();
		$title = basename($directory);
		$command = $config['jukeboxConnector'] . ' ' . $directory;
		$result = exec($command, $output);
		
		
		while (list(,$line) = each ($output)) {
			if (preg_match("/^t name=(.*)$/", $line, $matches)) {
				$title = $matches[1];
			}
			
			if (preg_match("/^d name=(.*) id=(.*)$/", $line, $matches)) {
				$files[] = array(
					'name'	=> $matches[1],
					'path'  => $directory . $matches[2], 
					'type'	=> 'dir',
					'icon'	=> 'folder'
				);
			}

			if (preg_match("/^f name=(.*) path=(.*)$/", $line, $matches)) {
				$files[] = array(
					'name'	=> $matches[1],
					'path'  => $matches[2], 
					'type'	=> 'file',
					'icon'	=> 'video'
				);
			}
		}
		
		return array(
			'title' => $title,
			'directory' => $directory,
			'files' => $files
		);
	}
	
	function getServices() {
		$services = array();
		$settings = file_get_contents('/tmp/setting.txt');

		for ($i = 1; $i <= 10; $i++) {
			if (preg_match("/services_url" . $i . "\=(.*)/", $settings, $matches)) {
				$url = trim($matches[1]);
				if (preg_match("/services_name" . $i . "\=(.*)/", $settings, $matches)) {
					$name = trim($matches[1]);	

					if ($url != '' && $name != '') {
						$services[] = array(
							'name' => $name,
							'type' => 'service',
							'icon' => 'service',
							'path' => $url
						);
					}
				}
			}
		}

		return $services;
	}
	
	function getUpnpServers($parent) {
		$servers = array();
		
		$buffer = file_get_contents('http://127.0.0.1:8883/start.cgi?list');
		
		if (preg_match_all("/a href=\"([^\"]*)\"[^>]*fip=\"([^\"]*)\"/iU", $buffer, $links, PREG_SET_ORDER)) {
			while (list(,$link) = each($links)) {
				if (substr($link[1], 0, 38) == 'http://127.0.0.1:8883/upnp/upnp-av.cgi' && substr($link[1], -6) != 'cdroot') {
					$servers[] = array(
						'id'   => 'upnp_' . base64_encode(html_entity_decode($link[1]) . '|' . $parent . '|' . html_entity_decode($link[2])),
						'name' => html_entity_decode($link[2]),
						'type' => 'upnp',
						'icon' => 'upnp',
						'path' => html_entity_decode($link[1])
					);
				}
			}
		}
		
		return $servers;
	}
	
	function getUpnpPath($path) {
		list($path, $parent, $title) = explode('|', $path);
		$data = array(
			'path'	=> $path,
			'parent' => $parent,
			'title' => $title,
			'files' => array()
		);
		
		$buffer = retrieveUpnpUrl($path);
		
		// Handle any redirections
		while (preg_match("/<meta http-equiv=\"refresh\" content=\"0;url=([^\"]+)\">/iU", $buffer, $match)) {
			$path = html_entity_decode($match[1]);
			$buffer = retrieveUpnpUrl($path);
		}
		
		// Setup basic data we need for recognition
		$server = parse_url($path);
		$server = $server['scheme'] . '://' . $server['host'] . ':' . $server['port'];
		
		// Analyse the retrieved data
		$data['files'] = array_merge($data['files'], analyseUpnpData($buffer, $path, $server));

		// Retrieve the rest of the upnp style pages and analyse them
		while (preg_match("/<a[^>]*name=\"nextpage\"[^>]*>/iU", $buffer, $match)) {
			if (preg_match("/href=\"javascript:location.replace\(\'([^\']*)'\)\"/", $match[0], $path)) {
				$path = html_entity_decode($path[1]);
				$buffer = retrieveUpnpUrl($path);
				$data['files'] = array_merge($data['files'], analyseUpnpData($buffer, $path, $server));
			} else {
				break;
			}
		}
		
		// Retrieve the rest of the MyIhome style pages and analyse them
		while (preg_match("/<a[^>]*tvid=pgdn[^>]*>/iU", $buffer, $match)) {
			if (preg_match("/href=\"([^\"]*)\"/", $match[0], $path)) {
				$path = html_entity_decode($path[1]);
				$buffer = retrieveUpnpUrl($path);
				$data['files'] = array_merge($data['files'], analyseUpnpData($buffer, $path, $server));
			} else {
				break;
			}
		}
		
		return $data;
	}
	
	function analyseUpnpData($contents, $path, $server) {
		$files = array();
	
		if (preg_match_all("/(<a[^>]*>)(.*)<\/a>/iU", $contents, $matches, PREG_SET_ORDER)) {
			while (list(,$m) = each($matches)) {
				$match = $m[1];
				
				if ($m[2] == '') {
					continue;
				}

				if (preg_match("/href=\"([^\"]*)\"/iU", $match, $href)) {
					$href = html_entity_decode($href[1]);
					if (substr($href, 0, 1) == '/') {
						$href = $server . $href;
					}

					if (substr($href, -10) == 'searchform' ||
						substr($href, -14) == 'playlist&page=') {
						continue;
					}

					$name = '';
					if (preg_match("/fip=\"([^\"]*)\"/iU", $match, $n)) {
						$name = html_entity_decode($n[1]);
					}
					
					if ($name == '') {
						$name = trim(html_entity_decode(strip_tags($m[2])));
					}

					$file = strpos($match, ' vod') !== false ? 'video' : '';
					$file = strpos($match, ' aod') !== false ? 'audio' : $file;
					$file = strpos($match, ' pod') !== false ? 'playlist' : $file;
					
					if (substr($href, -15) == 'action=playsong') {
						$file = 'audio';
					}
					
					if (substr($href, -16) == 'action=playvideo') {
						$file = 'video';
					}
					
					if ($name != '' && $file != '') {
						$files[] = array(
							'name' => $name,
							'type' => 'file',
							'icon' => $file,
							'path' => $href
						);
					}
					else {
						// Default uPNP servers
						if (substr($href, 0, 38) == 'http://127.0.0.1:8883/upnp/upnp-av.cgi') 									// MyIhome servers
						{
							if ($name != '') {
								$files[] = array(
									'id'   => 'upnp_' . base64_encode($href . '|' . $path . '|' . $name),
									'name' => $name,
									'type' => 'dir',
									'icon' => 'folder',
									'path' => $href
								);
							}
						}
						
						// MyIhome servers root
						if (substr($href, 0, 12 + strlen($server)) == $server . '/application') 									
						{
							if ($name == '') {
								if ($href == $server . '/application/video') {
									$name = 'Video';
								}
								
								if ($href == $server . '/application/music') {
									$name = 'Music';
								}
								
								if ($href == $server . '/application/photo') {
									$name = 'Photo';
								}
							}
							
							$href = $href . '/';
							
							if ($name != '') {
								$files[] = array(
									'id'   => 'upnp_' . base64_encode($href . '|' . $path . '|' . $name),
									'name' => $name,
									'type' => 'dir',
									'icon' => 'folder',
									'path' => $href
								);
							}
						}
						
						// MyIhome servers lists
						if (substr($href, 0, 13 + strlen($server)) == $server . '/perform?list') 									
						{
							$files[] = array(
								'id'   => 'upnp_' . base64_encode($href . '|' . $path . '|' . $name),
								'name' => $name,
								'type' => 'dir',
								'icon' => 'folder',
								'path' => $href
							);
						}
					}
				}
			}
		}

		return $files;
	}

	function background_exec($command) {
		$handle = popen($command, "r");
		stream_set_blocking($handle, false);
		pclose($handle);
	}

	function naturalSortByName($a, $b) { 
    	return strnatcmp(strtolower($a['name']), strtolower($b['name'])); 
  	} 
        
		
	function retrieveUpnpUrl($url) {
		$parsedUrl = parse_url($url);
	
		if ($parsedUrl['host'] == '127.0.0.1') {
			return file_get_contents($url);
		} else {
			return retrieveMyIHomeUrl($parsedUrl);
		}
	}
		
	function retrieveMyIHomeUrl($url) {
		if (isset($GLOBALS['MyIHomeCookie'])) {
			return retrieveUrl($url, "Cookie: JSESSIONID=" . $GLOBALS['MyIHomeCookie'] . "\r\n");
		} else {
			$u = array(
				'host' =>	$url['host'],
				'port' => 	$url['port'],
				'path' => 	'',
				'query' =>	''
			);
		
			$GLOBALS['MyIHomeCookie'] = retrieveCookie($u, 'JSESSIONID');
			return retrieveUrl($url, "Cookie: JSESSIONID=" . $GLOBALS['MyIHomeCookie'] . "\r\n");
		}
	}
		
	function retrieveCookie($url, $cookie) {
		$result = retrieveUrl($url, '', true);
		
		if (preg_match("/Set-Cookie: " . $cookie . "=([^;]+);/iU", $result, $matches)) {
			return $matches[1];
		}
		
		return '';
	}
		
	function retrieveUrl($url, $headers = '', $raw = false) {
		$result = '';
	
		if ($fp = fsockopen($url['host'], $url['port'] ? $url['port'] : 80, $errno, $errstr, 30)) {
		    $out = "GET " . ($url['path'] ? $url['path'] : '/') . ($url['query'] ? '?' . $url['query'] : '') . " HTTP/1.1\r\n";
		    $out .= "Host: " . $url['host'] . ($url['port'] ? ':' . $url['port'] : '') . "\r\n";
		    $out .= "Connection: Close\r\n";
			$out .= "User-Agent: Mozilla/5.0\r\n";
			
			if ($headers != '') {
				$out .= $headers;
			}
			
			$out .= "\r\n";
			fwrite($fp, $out);
			
			$content = false;

		    while (!feof($fp)) {
		        $line = fgets($fp, 128);
				
				if ($content || $raw) {
        			$result .= $line;
    			}
				
				if (!$content && $line == "\r\n") { 
					$content = true;
				}
		    }
			
		    fclose($fp);
		}	
		
		return $result;
	}