const fs = require('fs')
const EventEmitter = require('events')
const csvParse = require('csv-parse')

class AirodumpParser extends EventEmitter {

	constructor() {
		super()
		this.networks = {}
		this.stations = {}
	}

	loadCSV(filename) {

		fs.readFile(filename, 'utf8', (err, data) => {
		
			if (err) {
				console.log(`[error] error loading ${filename}. Exiting.`)
				process.exit(1)
			}

			data = data.toString()
			const split = data.indexOf('Station MAC, First time seen, Last time seen, Power, # packets, BSSID, Probed ESSIDs')
			if (split > -1) {
				// skip some empty chars and newlines
				const networks = data.substring(2, split - 3)
				const stations = data.substring(split)

				csvParse(networks, {columns: true, delimiter: ','}, (err, output) => {
					this._updateNetworks(this._cleanNetworksCSVOutput(output))
				})

				csvParse(stations, {columns: true, delimiter: ','}, (err, output) => {
					this._updateStations(this._cleanStationsCSVOutput(output))
				})
			}
		})
	}

	_cleanNetworksCSVOutput(networks) {
		return networks.map((n) => {
			return {
				bssd: n.BSSID,
				firstSeen: n[' First time seen'].trim(),
				lastSeen: n[' Last time seen'].trim(),
				channel: parseInt(n[' channel']),
				speed: parseInt(n[' Speed']),
				privacy: n[' Privacy'].trim(),
				cipher: n[' Cipher'].trim(),
				auth: n[' Authentication'].trim(),
				power: parseInt(n[' Power'].trim()),
				beacons: parseInt(n[' # beacons']),
				iv: parseInt(n[' # IV']),
				lanIP: n[' LAN IP'].split('.').map(x => parseInt(x)).join('.'),
				ssid: n[' ESSID'].trim(),
				key: n[' Key'].trim()
			}
		})
	}

	_cleanStationsCSVOutput(stations) {
		// come back and see why filter bombs sometimes
		return stations
			.filter(s => {
				return s.hasOwnProperty('Station MAC') && 
					   s.hasOwnProperty(' First time seen') &&
					   s.hasOwnProperty(' Last time seen') &&
					   s.hasOwnProperty(' Power') &&
					   s.hasOwnProperty(' # packets') &&
					   s.hasOwnProperty(' BSSID') &&
					   s.hasOwnProperty(' Probed ESSIDs')
			})
			.map((s) => {
					return {
						mac: s['Station MAC'],
						firstSeen: s[' First time seen'].trim(),
						lastSeen: s[' Last time seen'].trim(),
						power: parseInt(s[' Power']),
						packets: parseInt(s[' # packets']),
						network: s[' BSSID'].trim() == '(not associated)' ? null : s[' BSSID'].trim(),
						probes: s[' Probed ESSIDs'].trim().split(',').filter(x => x != '')
					}
			})
	}

	_updateNetworks(networks) {

		// networks.forEach((net) => {
		// 	if (!this.networks.hasOwnProperty(net.mac)) {
		// 		this.networks[net.mac] = net

		// 	}
		// })
		fs.writeFileSync('data/example-networks.json', JSON.stringify(networks))
	}

	_updateStations(stations) {
		fs.writeFileSync('data/example-stations.json', JSON.stringify(stations))
		console.log(stations)
	}
}

module.exports = {
	AirodumpParser
}