<?php

	$root = isset($_SERVER["USER"]) ? ($_SERVER["USER"] == 'root' ? true : false) : false;
	$normal = ! $root;
	
	
	/* The lighttpd server runs as root, so we can use a special continues root mode */
	if ($root && isset($_SERVER["SERVER_SOFTWARE"]) && substr($_SERVER["SERVER_SOFTWARE"], 0, 9) == "lighttpd/") {
		$normal = true;
	}

	
	$buffer = null;
	
	function elevateToRoot($forget = false) {
		global $root, $normal, $buffer;
		
		if ($root && $normal) {
			if (!is_null($buffer)) {
				return $buffer;
			}
			
			return;
		}
		
		$base = $_SERVER["SCRIPT_FILENAME"];
		$base = str_replace('/opt/sybhttpd/localhost.drives/', '', $base);
		$base = str_replace('/share/', 'HARD_DISK/', $base);
		$base = substr($base, 0, -4) . '.cgi';
		
		$result = '';
		
		if ($fp = fsockopen("127.0.0.1", 8883, $errno, $errstr, 30)) {
		    $out = "GET /" . $base . '?' . $_SERVER["QUERY_STRING"] . " HTTP/1.1\r\n";
		    $out .= "Host: localhost.drives\r\n";
		    $out .= "Connection: Close\r\n\r\n";
		    fwrite($fp, $out);
			
			if ($forget) {
				fclose($fp);
				exit;
			}

			$content = false;

		    while (!feof($fp)) {
		        $line = fgets($fp, 128);
				
				if ($content) {
        			$result .= $line;
    			}
				
				if (!$content && $line == "\r\n") { 
					$content = true;
				}
		    }
			
		    fclose($fp);
		}		
		
		if ($result != '') {
			return unserialize($result);
		}
	}
	
	function returnToNormal($result = null) {
		global $root, $normal, $buffer;
		
		if ($root && $normal) {
			$buffer = $result;
			return;
		}
		
		if ($result) {
			echo serialize($result);
		}
		
		exit;
	}

