module.exports = {
	// serviceUUID: 					'7468656861626974736c61626e616269',
	// receiveCharacteristicUUID: 		'7468656961626974736c61626e616269',
	// sendCharacteristicUUID: 		'7468656a61626974736c61626e616269',
	// disconnectCharacteristicUUID: 	'7468656b61626974736c61626e616269',

	serviceUUID: '2220',
	receiveCharacteristicUUID: '2221',
	sendCharacteristicUUID: '2222',
	disconnectCharacteristicUUID: '2223',

	getAdvertisedServiceName: function(peripheral) {
		// RFduino provide one BluetoothService
		// The Arduino api allows the device to advertise what service the hardware is providing, e.g. 'temp', 'rgb', 'ledbtn'
		// The data is sent in the manufacturer data string
		// The temperature sketch sends [0,0,102,105,108,101]       
		// remove the first 2 characters, remaining data is the name of the RFduino service
		console.log(peripheral.advertisement)
		return peripheral.advertisement.manufacturerData.slice(2).toString();
	}
};