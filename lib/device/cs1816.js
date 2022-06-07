module.exports = {
  name: 'CS1816',
  id: 0xFE,
  commands: {
    configure: {
      opCode: 0,
    },
    keySwitch: {
      opCode: 1,
    },
    watch: {
      opCode: 2,
      maxLen: 4,
    },
    unwatch: {
      opCode: 3,
    },
    unwatchAll: {
      opCode: 4,
    },
    superWatch: {
      opCode: 5,
      requirements: { softwareRevision: 1.5 },
      slot: 0xFF,
    },
    getWatcher: {
      opCode: 6,
      params: {
        getWatchers: 0,
        getSuperWatcher: 1,
      },
      requirements: { softwareRevision: 1.5 },
    },
  },
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
        status6:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000b' },
        status7:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000c' },
        status8:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000d' },
        status9:      { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000e' },
        status10:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9000f' },
        status11:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90010' },
        status12:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90011' },
        status13:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90012' },
        status14:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90013' },
        status15:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90014' },
        // As of CS1816 software 1.5, there are 25 status characteristics defined,
        // but MAX_WATCHERS is set to 15. Need to figure out why.
        // status16:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90015' },
        // status17:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90016' },
        // status18:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90017' },
        // status19:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90018' },
        // status20:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c90019' },
        // status21:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9001a' },
        // status22:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9001b' },
        // status23:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9001c' },
        // status24:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9001d' },
        // status25:     { uuid: '6765ed1f-4de1-49e1-4771-a14380c9001e' },
        superWatcher: { uuid: '6765ed1f-4de1-49e1-4771-a14380c900ff' },
      },
    },
    transparentUart: {
      uuid: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristics: {
        rx:      { uuid: '49535343-1e4d-4bd9-ba61-23c647249616' },
        tx:      { uuid: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
        control: { uuid: '49535343-4c8a-39b3-2f49-511cff073b7e' },
      },
    },
  },
};
