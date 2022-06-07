module.exports = {
  name: 'CS1814',
  id: 0xFE,
  services: {
    deviceInformation: {
      // This service uses the Bluetotoh Base UUID range for its UUIDs. Some
      // implementations may use shorthand to represent the UUIDs for this service
      // and is characteristics, e.g., '180a'.
      uuid: '0000180a-0000-1000-8000-00805f9b34fb',
      characteristics: {
        systemId:           { uuid: '00002a23-0000-1000-8000-00805f9b34fb' },
        modelNumber:        { uuid: '00002a24-0000-1000-8000-00805f9b34fb' },
        dongleSerialNumber: { uuid: '00002a25-0000-1000-8000-00805f9b34fb', optional: true },
        firmwareRevision:   { uuid: '00002a26-0000-1000-8000-00805f9b34fb' },
        hardwareRevision:   { uuid: '00002a27-0000-1000-8000-00805f9b34fb' },
        softwareRevision:   { uuid: '00002a28-0000-1000-8000-00805f9b34fb' },
        manufacturerName:   { uuid: '00002a29-0000-1000-8000-00805f9b34fb' },
      },
    },
    controller: {
      // We typically scan for this UUID
      uuid: '6765ed1f-4de1-49e1-4771-a14380c90000',
      characteristics: {
        command:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90001' },
        response:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90002' },
        product:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90003' },
        serial:       { uuid: '6765ed1f-4de1-49e1-4771-a14380c90004' },
        fault:        { uuid: '6765ed1f-4de1-49e1-4771-a14380c90005' },
        status1:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90006' },
        status2:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90007' },
        status3:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90008' },
        status4:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c90009' },
        status5:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000a' },
      }
    },
    transparentUart: {
      uuid: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristics: {
        rx: { uuid: '49535343-1e4d-4bd9-ba61-23c647249616' },
        tx: { uuid: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
        control: { uuid: '49535343-4c8a-39b3-2f49-511cff073b7e' },
      },
    },
  }
};
