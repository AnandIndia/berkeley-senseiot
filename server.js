/**
 * Berkeley SenseIoT - Backend Server
 * Runtime: Node.js (via agy-node or standard node)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'senseiot_db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- In-Memory Database & Persistence ---
let db = {
  gateways: [],
  assets: [],
  alarms: [],
  facilioConfig: {
    enabled: true,
    baseUrl: 'https://app.facilio.com/api/v3',
    orgId: 'FACILIO_BERKELEY_904',
    apiKey: 'fc_live_9488a912e734bc0082f1',
    siteId: 'SITE_BERKELEY_HQ',
    autoDispatchOnCritical: true,
    defaultPriority: 'High',
    webhookSecret: 'sec_wh_749320bf82',
    mockMode: true
  },
  facilioLogs: [],
  customFields: [],
  stateflows: [],
  users: [],
  telemetryHistory: [],
  simulatorConfig: {
    running: true,
    tickIntervalMs: 3000,
    activeFaults: []
  }
};

function initSeedData() {
  const now = Date.now();

  const defaultCustomFields = [
    { id: 'CF-001', entity: 'ASSET', label: 'Manufacturer / Brand', key: 'manufacturer', type: 'text', required: true, defaultValue: 'Trane' },
    { id: 'CF-002', entity: 'ASSET', label: 'Serial Number', key: 'serialNumber', type: 'text', required: false, defaultValue: 'TRN-2024-8842' },
    { id: 'CF-003', entity: 'ASSET', label: 'Commissioning Date', key: 'commissioningDate', type: 'date', required: false, defaultValue: '2023-04-15' },
    { id: 'CF-004', entity: 'ASSET', label: 'Maintenance Contractor', key: 'contractor', type: 'select', options: ['Berkeley Facility Services', 'Carrier Certified HVAC', 'Siemens Building Tech', 'Johnson Controls'], required: false, defaultValue: 'Berkeley Facility Services' },
    { id: 'CF-005', entity: 'ASSET', label: 'Asset QR Tag', key: 'qrTag', type: 'text', required: false, defaultValue: 'QR-BKY-8821' },
    { id: 'CF-006', entity: 'GATEWAY', label: 'Firmware Version', key: 'firmwareVer', type: 'text', required: false, defaultValue: 'v2.8.4-LTS' },
    { id: 'CF-007', entity: 'GATEWAY', label: 'Cellular SIM ICCID', key: 'simIccid', type: 'text', required: false, defaultValue: '89014103211118510720' },
    { id: 'CF-008', entity: 'SENSOR', label: 'Calibration Date', key: 'calibrationDate', type: 'date', required: false, defaultValue: '2024-01-10' }
  ];

  const defaultGateways = [
    {
      id: 'GW-01',
      name: 'Central Plant Gateway 01',
      model: 'Advantech WISE-710 Edge Gateway',
      ip: '192.168.10.50',
      mac: '00:1E:C0:84:1A:12',
      protocol: 'MQTT',
      port: 1883,
      apiKey: 'gw_key_central_plant_9918',
      status: 'ONLINE',
      lastHeartbeat: new Date(now - 12000).toISOString(),
      packetRate: 142,
      location: 'Basement Level 2 - Central Plant Room',
      notes: 'Primary IoT gateway collecting Modbus RS485 & 4-20mA sensor loops for chillers & primary pumps.',
      customFields: {
        firmwareVer: 'v3.1.2-Advantech',
        simIccid: '89014103211118510720'
      }
    },
    {
      id: 'GW-02',
      name: 'Rooftop AHU & HVAC Gateway',
      model: 'Teltonika RUT955 Industrial IoT',
      ip: '192.168.10.51',
      mac: '00:1E:C0:84:3B:44',
      protocol: 'HTTP',
      port: 8080,
      apiKey: 'gw_key_rooftop_ahu_4412',
      status: 'ONLINE',
      lastHeartbeat: new Date(now - 8000).toISOString(),
      packetRate: 98,
      location: 'Roof Level Mechanical Deck',
      notes: 'Dedicated gateway connecting air handling units, exhaust fans, and ambient weather telemetry.',
      customFields: {
        firmwareVer: 'v2.8.4-LTS',
        simIccid: '89014103211118510721'
      }
    },
    {
      id: 'GW-03',
      name: 'Electrical Substation Gateway',
      model: 'Schneider Electric PowerLogic Gateway',
      ip: '192.168.10.52',
      mac: '00:1E:C0:84:5F:99',
      protocol: 'MODBUS_TCP',
      port: 502,
      apiKey: 'gw_key_substation_trans_2209',
      status: 'ONLINE',
      lastHeartbeat: new Date(now - 15000).toISOString(),
      packetRate: 110,
      location: 'Ground Floor LV Switchgear Room',
      notes: 'Monitors main transformer temperature, busbar vibration, harmonics, and load currents.',
      customFields: {
        firmwareVer: 'v4.0.1-PowerLogic',
        simIccid: '89014103211118510722'
      }
    }
  ];

  const defaultAssets = [
    {
      id: 'AST-101',
      name: 'Chiller 01 - Primary Water Loop',
      tag: 'CH-01-B2',
      category: 'HVAC & Cooling',
      location: 'Basement 2 - Chiller Plant',
      building: 'Berkeley Tower A',
      floor: 'Basement -2',
      criticality: 'CRITICAL',
      gatewayId: 'GW-01',
      status: 'HEALTHY',
      stateflowState: 'NORMAL',
      customFields: {
        manufacturer: 'Trane CenTraVac',
        serialNumber: 'TRN-2023-CT7710',
        commissioningDate: '2023-02-18',
        contractor: 'Carrier Certified HVAC',
        qrTag: 'QR-BKY-CH01'
      },
      sensors: [
        {
          id: 'SNS-101-1',
          name: 'Evaporator Chilled Water Return Temp',
          type: 'temperature',
          unit: '°C',
          currentValue: 11.8,
          warningLow: 6.0,
          criticalLow: 4.0,
          warningHigh: 14.5,
          criticalHigh: 17.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-01-15' }
        },
        {
          id: 'SNS-101-2',
          name: 'Compressor Motor Vibration RMS',
          type: 'vibration',
          unit: 'mm/s',
          currentValue: 2.1,
          warningHigh: 4.5,
          criticalHigh: 7.2,
          status: 'NORMAL',
          sampleRateSec: 2,
          customFields: { calibrationDate: '2024-02-01' }
        },
        {
          id: 'SNS-101-3',
          name: 'Refrigerant Discharge Pressure',
          type: 'pressure',
          unit: 'bar',
          currentValue: 12.4,
          warningHigh: 16.5,
          criticalHigh: 19.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-01-20' }
        },
        {
          id: 'SNS-101-4',
          name: 'Compressor Active Power Load',
          type: 'current',
          unit: 'kW',
          currentValue: 185.4,
          warningHigh: 240.0,
          criticalHigh: 280.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-01-10' }
        }
      ]
    },
    {
      id: 'AST-102',
      name: 'AHU-04 - Floor 4 East Air Handler',
      tag: 'AHU-04-E',
      category: 'Air Distribution',
      location: '4th Floor Mechanical Closet',
      building: 'Berkeley Tower A',
      floor: 'Floor 4',
      criticality: 'HIGH',
      gatewayId: 'GW-02',
      status: 'HEALTHY',
      stateflowState: 'NORMAL',
      customFields: {
        manufacturer: 'Daikin Applied',
        serialNumber: 'DKN-AHU-2022-901',
        commissioningDate: '2022-11-04',
        contractor: 'Berkeley Facility Services',
        qrTag: 'QR-BKY-AHU04'
      },
      sensors: [
        {
          id: 'SNS-102-1',
          name: 'Supply Air Discharge Temp',
          type: 'temperature',
          unit: '°C',
          currentValue: 15.2,
          warningHigh: 22.0,
          criticalHigh: 26.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-03-01' }
        },
        {
          id: 'SNS-102-2',
          name: 'Supply Air Fan Bearing Vibration',
          type: 'vibration',
          unit: 'mm/s',
          currentValue: 1.8,
          warningHigh: 4.0,
          criticalHigh: 6.5,
          status: 'NORMAL',
          sampleRateSec: 3,
          customFields: { calibrationDate: '2024-02-15' }
        },
        {
          id: 'SNS-102-3',
          name: 'Duct Relative Humidity',
          type: 'humidity',
          unit: '%RH',
          currentValue: 52.6,
          warningHigh: 68.0,
          criticalHigh: 80.0,
          status: 'NORMAL',
          sampleRateSec: 10,
          customFields: { calibrationDate: '2024-01-05' }
        }
      ]
    },
    {
      id: 'AST-103',
      name: 'Booster Pump 02 - Potable Water Distribution',
      tag: 'PMP-B2-02',
      category: 'Plumbing & Hydraulic',
      location: 'Basement 2 - Pump Room',
      building: 'Berkeley Tower B',
      floor: 'Basement -2',
      criticality: 'HIGH',
      gatewayId: 'GW-01',
      status: 'WARNING',
      stateflowState: 'WARNING',
      customFields: {
        manufacturer: 'Grundfos Hydro Multi-E',
        serialNumber: 'GF-PMP-88192-A',
        commissioningDate: '2023-06-20',
        contractor: 'Berkeley Facility Services',
        qrTag: 'QR-BKY-PMP02'
      },
      sensors: [
        {
          id: 'SNS-103-1',
          name: 'Discharge Header Water Pressure',
          type: 'pressure',
          unit: 'bar',
          currentValue: 6.8,
          warningLow: 4.5,
          criticalLow: 3.0,
          warningHigh: 8.5,
          criticalHigh: 10.0,
          status: 'NORMAL',
          sampleRateSec: 2,
          customFields: { calibrationDate: '2024-01-22' }
        },
        {
          id: 'SNS-103-2',
          name: 'Impeller Bearing Vibration',
          type: 'vibration',
          unit: 'mm/s',
          currentValue: 4.8,
          warningHigh: 4.2,
          criticalHigh: 6.8,
          status: 'WARNING',
          sampleRateSec: 2,
          customFields: { calibrationDate: '2024-02-10' }
        },
        {
          id: 'SNS-103-3',
          name: 'Motor Casing Temperature',
          type: 'temperature',
          unit: '°C',
          currentValue: 68.2,
          warningHigh: 75.0,
          criticalHigh: 88.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-02-10' }
        }
      ]
    },
    {
      id: 'AST-104',
      name: 'Substation Transformer #1 (2500kVA)',
      tag: 'XFR-LV-01',
      category: 'Electrical Distribution',
      location: 'Ground Floor LV Switchgear Room',
      building: 'Berkeley Tower A',
      floor: 'Ground Floor',
      criticality: 'CRITICAL',
      gatewayId: 'GW-03',
      status: 'HEALTHY',
      stateflowState: 'NORMAL',
      customFields: {
        manufacturer: 'Schneider Electric Trihal',
        serialNumber: 'SE-XFR-2021-331',
        commissioningDate: '2021-08-10',
        contractor: 'Siemens Building Tech',
        qrTag: 'QR-BKY-XFR01'
      },
      sensors: [
        {
          id: 'SNS-104-1',
          name: 'Core Winding Temperature',
          type: 'temperature',
          unit: '°C',
          currentValue: 72.4,
          warningHigh: 95.0,
          criticalHigh: 115.0,
          status: 'NORMAL',
          sampleRateSec: 5,
          customFields: { calibrationDate: '2024-01-18' }
        },
        {
          id: 'SNS-104-2',
          name: 'Phase 1-3 Total Current Draw',
          type: 'current',
          unit: 'A',
          currentValue: 1840,
          warningHigh: 2800,
          criticalHigh: 3400,
          status: 'NORMAL',
          sampleRateSec: 2,
          customFields: { calibrationDate: '2024-01-18' }
        }
      ]
    }
  ];

  const defaultAlarms = [
    {
      id: 'ALM-8491',
      assetId: 'AST-103',
      assetName: 'Booster Pump 02 - Potable Water Distribution',
      sensorId: 'SNS-103-2',
      sensorType: 'vibration',
      severity: 'WARNING',
      message: 'Impeller Bearing Vibration reached 4.80 mm/s (Exceeds Warning limit 4.20 mm/s)',
      triggerValue: 4.8,
      threshold: 4.2,
      timestamp: new Date(now - 1800000).toISOString(),
      status: 'ACTIVE',
      acknowledgedBy: null,
      facilioTicketId: null,
      facilioSyncTime: null
    }
  ];

  const defaultFacilioLogs = [
    {
      id: 'FCL-LOG-101',
      timestamp: new Date(now - 86400000).toISOString(),
      action: 'CREATE_WORK_ORDER',
      assetId: 'AST-101',
      assetName: 'Chiller 01 - Primary Water Loop',
      facilioTicketId: 'WO-FAC-90142',
      status: 'SUCCESS',
      requestPayload: {
        module: 'workorder',
        data: {
          subject: 'IoT Trigger: Chiller 01 High Evaporator Water Temp (16.2°C)',
          description: 'Automated dispatch by Berkeley SenseIoT telemetry threshold rule.',
          siteId: 'SITE_BERKELEY_HQ',
          assetId: 'AST-101',
          priority: 'High',
          category: 'HVAC Reactive'
        }
      },
      responsePayload: {
        code: 201,
        message: 'Work Order created successfully in Facilio CAFM',
        workOrderId: 'WO-FAC-90142',
        ticketNumber: '#WO-90142',
        assignedGroup: 'HVAC Emergency Response Team'
      }
    }
  ];

  const defaultStateflows = [
    {
      id: 'STF-001',
      name: 'Critical Asset IoT Failure & Facilio Escalation',
      description: 'Standard lifecycle for critical cooling and electrical assets from normal sensor tracking to automated CAFM ticket dispatch and technician resolution.',
      isDefault: true,
      states: [
        { id: 'NORMAL', label: 'Normal / Healthy', color: '#00843D', description: 'All sensor telemetry within configured operating limits.' },
        { id: 'WARNING', label: 'Threshold Warning', color: '#F4981C', description: 'Sensor reading exceeds warning threshold for > 30s. Visual alert active.' },
        { id: 'CRITICAL', label: 'Critical / Failure Fault', color: '#C01E2E', description: 'Sensor breached critical safety limits or asset offline. Triggers audible alarm & CAFM ticket.' },
        { id: 'TICKET_DISPATCHED', label: 'Facilio WO Dispatched', color: '#2B388F', description: 'Incident logged in Facilio CAFM. Work order ID assigned to field technicians.' },
        { id: 'IN_REPAIR', label: 'Technician In-Repair', color: '#6366F1', description: 'Technician on site, diagnostic routine underway.' },
        { id: 'RESOLVED', label: 'Resolved & Verified', color: '#10B981', description: 'Sensor readings normalized and maintenance verified.' }
      ],
      transitions: [
        { from: 'NORMAL', to: 'WARNING', trigger: 'Telemetry > Warning Threshold', autoAction: 'Send Portal Banner Alert' },
        { from: 'WARNING', to: 'CRITICAL', trigger: 'Telemetry > Critical Threshold OR 3+ Warning Ticks', autoAction: 'Trigger Facilio Work Order Dispatch' },
        { from: 'CRITICAL', to: 'TICKET_DISPATCHED', trigger: 'Facilio API Response: 201 Created', autoAction: 'Log CAFM Sync Record' },
        { from: 'TICKET_DISPATCHED', to: 'IN_REPAIR', trigger: 'Technician Acknowledges in Mobile / Portal', autoAction: 'Update Incident Status' },
        { from: 'IN_REPAIR', to: 'RESOLVED', trigger: 'Telemetry stabilizes < Warning Threshold for 5 mins', autoAction: 'Close Alarm & Notify Facilio' },
        { from: 'RESOLVED', to: 'NORMAL', trigger: 'Supervisor Sign-off', autoAction: 'Reset Asset State' }
      ]
    }
  ];

  const defaultUsers = [
    { id: 'USR-01', name: 'Anand Gothandam', email: 'anand@berkeley-uae.com', role: 'ADMIN', department: 'Facility Operations & IoT', status: 'ACTIVE' },
    { id: 'USR-02', name: 'Rashid Al-Nuaimi', email: 'rashid.tech@berkeley-uae.com', role: 'ENGINEER', department: 'HVAC Maintenance', status: 'ACTIVE' },
    { id: 'USR-03', name: 'Marcus Vance', email: 'marcus.v@berkeley-uae.com', role: 'OPERATOR', department: 'Building Automation Center', status: 'ACTIVE' }
  ];

  const telemetryHistory = [];
  const timePoints = 48;
  for (let i = timePoints; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000).toISOString();
    
    telemetryHistory.push({
      assetId: 'AST-101',
      sensorId: 'SNS-101-1',
      sensorType: 'temperature',
      value: +(11.0 + Math.sin(i * 0.3) * 1.5 + (Math.random() * 0.4 - 0.2)).toFixed(2),
      timestamp: t
    });
    telemetryHistory.push({
      assetId: 'AST-101',
      sensorId: 'SNS-101-2',
      sensorType: 'vibration',
      value: +(2.0 + Math.cos(i * 0.2) * 0.4 + (Math.random() * 0.2 - 0.1)).toFixed(2),
      timestamp: t
    });
    telemetryHistory.push({
      assetId: 'AST-101',
      sensorId: 'SNS-101-4',
      sensorType: 'current',
      value: +(180.0 + Math.sin(i * 0.4) * 20.0 + (Math.random() * 5.0 - 2.5)).toFixed(1),
      timestamp: t
    });
    telemetryHistory.push({
      assetId: 'AST-103',
      sensorId: 'SNS-103-2',
      sensorType: 'vibration',
      value: +(3.6 + (timePoints - i) * 0.025 + Math.random() * 0.3).toFixed(2),
      timestamp: t
    });
    telemetryHistory.push({
      assetId: 'AST-102',
      sensorId: 'SNS-102-1',
      sensorType: 'temperature',
      value: +(14.8 + Math.sin(i * 0.25) * 1.2 + (Math.random() * 0.3 - 0.15)).toFixed(2),
      timestamp: t
    });
  }

  return {
    gateways: defaultGateways,
    assets: defaultAssets,
    alarms: defaultAlarms,
    facilioConfig: {
      enabled: true,
      baseUrl: 'https://app.facilio.com/api/v3',
      orgId: 'FACILIO_BERKELEY_904',
      apiKey: 'fc_live_9488a912e734bc0082f1',
      siteId: 'SITE_BERKELEY_HQ',
      autoDispatchOnCritical: true,
      defaultPriority: 'High',
      webhookSecret: 'sec_wh_749320bf82',
      mockMode: true
    },
    facilioLogs: defaultFacilioLogs,
    customFields: defaultCustomFields,
    stateflows: defaultStateflows,
    users: defaultUsers,
    telemetryHistory: telemetryHistory,
    simulatorConfig: {
      running: true,
      tickIntervalMs: 3000,
      activeFaults: []
    }
  };
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
      console.log('[DB] Loaded database with ' + db.assets.length + ' assets.');
    } else {
      db = initSeedData();
      saveDatabase();
      console.log('[DB] Initialized fresh database with seed data.');
    }
  } catch (err) {
    console.error('[DB] Fallback to seed data:', err.message);
    db = initSeedData();
  }
}

function saveDatabase() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Error saving database:', err.message);
  }
}

loadDatabase();

function processTelemetryReading(reading) {
  const { assetId, sensorId, sensorType, value, timestamp = new Date().toISOString() } = reading;
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return null;

  let sensor = asset.sensors.find(s => s.id === sensorId || s.type === sensorType);
  if (!sensor) return null;

  sensor.currentValue = Number(value);

  db.telemetryHistory.push({
    assetId,
    sensorId: sensor.id,
    sensorType: sensor.type,
    value: Number(value),
    timestamp
  });

  if (db.telemetryHistory.length > 1500) {
    db.telemetryHistory = db.telemetryHistory.slice(-1000);
  }

  let isCritical = false;
  let isWarning = false;
  let violationMsg = '';

  if (sensor.criticalHigh !== undefined && value >= sensor.criticalHigh) {
    isCritical = true;
    violationMsg = `${sensor.name} value (${value} ${sensor.unit}) breached CRITICAL HIGH limit (${sensor.criticalHigh} ${sensor.unit})`;
  } else if (sensor.criticalLow !== undefined && value <= sensor.criticalLow) {
    isCritical = true;
    violationMsg = `${sensor.name} value (${value} ${sensor.unit}) breached CRITICAL LOW limit (${sensor.criticalLow} ${sensor.unit})`;
  } else if (sensor.warningHigh !== undefined && value >= sensor.warningHigh) {
    isWarning = true;
    violationMsg = `${sensor.name} value (${value} ${sensor.unit}) exceeded WARNING HIGH limit (${sensor.warningHigh} ${sensor.unit})`;
  } else if (sensor.warningLow !== undefined && value <= sensor.warningLow) {
    isWarning = true;
    violationMsg = `${sensor.name} value (${value} ${sensor.unit}) exceeded WARNING LOW limit (${sensor.warningLow} ${sensor.unit})`;
  }

  if (isCritical) sensor.status = 'CRITICAL';
  else if (isWarning) sensor.status = 'WARNING';
  else sensor.status = 'NORMAL';

  const anyCritical = asset.sensors.some(s => s.status === 'CRITICAL');
  const anyWarning = asset.sensors.some(s => s.status === 'WARNING');

  if (anyCritical) {
    asset.status = 'CRITICAL';
    asset.stateflowState = 'CRITICAL';
  } else if (anyWarning) {
    asset.status = 'WARNING';
    if (asset.stateflowState === 'NORMAL') asset.stateflowState = 'WARNING';
  } else {
    asset.status = 'HEALTHY';
    if (asset.stateflowState === 'WARNING') asset.stateflowState = 'NORMAL';
  }

  if (isCritical || isWarning) {
    const existingAlarm = db.alarms.find(a => a.assetId === assetId && a.sensorId === sensor.id && a.status === 'ACTIVE');
    if (!existingAlarm) {
      const newAlarm = {
        id: `ALM-${Math.floor(1000 + Math.random() * 9000)}`,
        assetId: asset.id,
        assetName: asset.name,
        sensorId: sensor.id,
        sensorType: sensor.type,
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        message: violationMsg,
        triggerValue: Number(value),
        threshold: isCritical ? (sensor.criticalHigh || sensor.criticalLow) : (sensor.warningHigh || sensor.warningLow),
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
        acknowledgedBy: null,
        facilioTicketId: null,
        facilioSyncTime: null
      };

      db.alarms.unshift(newAlarm);

      if (isCritical && db.facilioConfig.enabled && db.facilioConfig.autoDispatchOnCritical) {
        dispatchAlarmToFacilio(newAlarm);
      }
    }
  }

  return { asset, sensor };
}

function dispatchAlarmToFacilio(alarm) {
  const asset = db.assets.find(a => a.id === alarm.assetId);
  const ticketId = `WO-FAC-${Math.floor(10000 + Math.random() * 90000)}`;

  const requestPayload = {
    module: 'workorder',
    data: {
      subject: `[SenseIoT Alert] ${alarm.severity}: ${alarm.assetName}`,
      description: `${alarm.message}. Auto-escalated from Berkeley SenseIoT Gateway.`,
      siteId: db.facilioConfig.siteId || 'SITE_BERKELEY_HQ',
      assetId: alarm.assetId,
      priority: alarm.severity === 'CRITICAL' ? 'Urgent' : 'High',
      category: asset?.category || 'IoT Preventative Maintenance',
      customFields: {
        senseiotAlarmId: alarm.id,
        triggerTimestamp: alarm.timestamp,
        sensorType: alarm.sensorType
      }
    }
  };

  const responsePayload = {
    code: 201,
    status: 'SUCCESS',
    message: 'Work Order created in Facilio CAFM',
    workOrderId: ticketId,
    ticketNumber: `#${ticketId}`,
    assignedGroup: 'Rapid Engineering Response Team',
    createdAt: new Date().toISOString()
  };

  alarm.facilioTicketId = ticketId;
  alarm.facilioSyncTime = new Date().toISOString();
  alarm.status = 'FACILIO_WO_CREATED';

  if (asset) {
    asset.stateflowState = 'TICKET_DISPATCHED';
  }

  const logEntry = {
    id: `FCL-LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    action: 'CREATE_WORK_ORDER',
    assetId: alarm.assetId,
    assetName: alarm.assetName,
    facilioTicketId: ticketId,
    status: 'SUCCESS',
    requestPayload,
    responsePayload
  };

  db.facilioLogs.unshift(logEntry);
  if (db.facilioLogs.length > 100) db.facilioLogs = db.facilioLogs.slice(0, 100);

  saveDatabase();
  return { ticketId, logEntry };
}

// Background Simulator Loop
setInterval(() => {
  if (!db.simulatorConfig.running) return;

  const now = new Date().toISOString();

  db.gateways.forEach(gw => {
    if (gw.status === 'ONLINE') {
      gw.lastHeartbeat = now;
      gw.packetRate = Math.floor(90 + Math.random() * 60);
    }
  });

  db.assets.forEach(asset => {
    const fault = db.simulatorConfig.activeFaults.find(f => f.assetId === asset.id);

    asset.sensors.forEach(sensor => {
      let nextVal = sensor.currentValue;

      if (fault && fault.sensor === sensor.type) {
        nextVal = fault.value;
      } else {
        const drift = (Math.random() - 0.49);
        if (sensor.type === 'temperature') {
          nextVal = +(nextVal + drift * 0.15).toFixed(2);
          if (nextVal < 5) nextVal = 5.2;
        } else if (sensor.type === 'vibration') {
          nextVal = +(nextVal + drift * 0.08).toFixed(2);
          if (nextVal < 0.2) nextVal = 0.5;
        } else if (sensor.type === 'pressure') {
          nextVal = +(nextVal + drift * 0.1).toFixed(2);
          if (nextVal < 1) nextVal = 1.2;
        } else if (sensor.type === 'current') {
          nextVal = +(nextVal + drift * 3.5).toFixed(1);
          if (nextVal < 10) nextVal = 50;
        } else if (sensor.type === 'humidity') {
          nextVal = +(nextVal + drift * 0.3).toFixed(1);
        }
      }

      processTelemetryReading({
        assetId: asset.id,
        sensorId: sensor.id,
        sensorType: sensor.type,
        value: nextVal,
        timestamp: now
      });
    });
  });
}, db.simulatorConfig.tickIntervalMs || 3000);

setInterval(() => {
  saveDatabase();
}, 10000);

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        if (!body || body.trim() === '') return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gateway-Key'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: true, message });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendError(res, 403, 'Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      sendError(res, 404, 'File not found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gateway-Key'
    });
    return res.end();
  }

  try {
    // 1. Dashboard Overview Stats
    if (pathname === '/api/overview' && method === 'GET') {
      const totalAssets = db.assets.length;
      const healthyAssets = db.assets.filter(a => a.status === 'HEALTHY').length;
      const warningAssets = db.assets.filter(a => a.status === 'WARNING').length;
      const criticalAssets = db.assets.filter(a => a.status === 'CRITICAL').length;
      const offlineAssets = db.assets.filter(a => a.status === 'OFFLINE').length;

      const totalGateways = db.gateways.length;
      const onlineGateways = db.gateways.filter(g => g.status === 'ONLINE').length;
      
      const totalSensors = db.assets.reduce((sum, a) => sum + (a.sensors?.length || 0), 0);
      const activeAlarms = db.alarms.filter(a => a.status === 'ACTIVE' || a.status === 'FACILIO_WO_CREATED');

      return sendJson(res, 200, {
        stats: {
          totalAssets,
          healthyAssets,
          warningAssets,
          criticalAssets,
          offlineAssets,
          totalGateways,
          onlineGateways,
          totalSensors,
          activeAlarmsCount: activeAlarms.length,
          facilioDispatchesCount: db.facilioLogs.length
        },
        activeAlarms: activeAlarms.slice(0, 8),
        recentLogs: db.facilioLogs.slice(0, 8),
        gateways: db.gateways,
        assetsSummary: db.assets.map(a => ({
          id: a.id,
          name: a.name,
          tag: a.tag,
          category: a.category,
          location: a.location,
          criticality: a.criticality,
          status: a.status,
          stateflowState: a.stateflowState,
          sensorsCount: a.sensors.length,
          sensors: a.sensors
        }))
      });
    }

    // 2. Assets API
    if (pathname === '/api/assets' && method === 'GET') {
      return sendJson(res, 200, db.assets);
    }

    if (pathname === '/api/assets' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.tag) {
        return sendError(res, 400, 'Asset name and tag are required');
      }

      const newAsset = {
        id: `AST-${Math.floor(100 + Math.random() * 900)}`,
        name: body.name,
        tag: body.tag,
        category: body.category || 'Mechanical',
        location: body.location || 'Building HQ',
        building: body.building || 'Main Tower',
        floor: body.floor || 'Level 1',
        criticality: body.criticality || 'MEDIUM',
        gatewayId: body.gatewayId || (db.gateways[0] ? db.gateways[0].id : null),
        status: 'HEALTHY',
        stateflowState: 'NORMAL',
        customFields: body.customFields || {},
        sensors: body.sensors && body.sensors.length > 0 ? body.sensors : [
          {
            id: `SNS-${Date.now().toString().slice(-4)}-1`,
            name: `${body.name} Temperature`,
            type: 'temperature',
            unit: '°C',
            currentValue: 24.0,
            warningHigh: 45.0,
            criticalHigh: 60.0,
            status: 'NORMAL',
            sampleRateSec: 5,
            customFields: {}
          }
        ]
      };

      db.assets.push(newAsset);
      saveDatabase();
      return sendJson(res, 201, newAsset);
    }

    const assetIdMatch = pathname.match(/^\/api\/assets\/([^\/]+)$/);
    if (assetIdMatch) {
      const assetId = assetIdMatch[1];
      const assetIndex = db.assets.findIndex(a => a.id === assetId);

      if (assetIndex === -1) {
        return sendError(res, 404, 'Asset not found');
      }

      if (method === 'GET') {
        const asset = db.assets[assetIndex];
        const gateway = db.gateways.find(g => g.id === asset.gatewayId);
        const alarms = db.alarms.filter(a => a.assetId === assetId);
        return sendJson(res, 200, { asset, gateway, alarms });
      }

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        db.assets[assetIndex] = {
          ...db.assets[assetIndex],
          ...body,
          id: assetId
        };
        saveDatabase();
        return sendJson(res, 200, db.assets[assetIndex]);
      }

      if (method === 'DELETE') {
        const removed = db.assets.splice(assetIndex, 1)[0];
        saveDatabase();
        return sendJson(res, 200, { success: true, removed });
      }
    }

    const assetSensorMatch = pathname.match(/^\/api\/assets\/([^\/]+)\/sensors$/);
    if (assetSensorMatch && method === 'POST') {
      const assetId = assetSensorMatch[1];
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return sendError(res, 404, 'Asset not found');

      const body = await parseJsonBody(req);
      if (!body.name || !body.type) {
        return sendError(res, 400, 'Sensor name and type are required');
      }

      const newSensor = {
        id: `SNS-${Date.now().toString().slice(-4)}-${asset.sensors.length + 1}`,
        name: body.name,
        type: body.type,
        unit: body.unit || '°C',
        currentValue: body.currentValue !== undefined ? Number(body.currentValue) : 20.0,
        warningHigh: body.warningHigh !== undefined && body.warningHigh !== '' ? Number(body.warningHigh) : undefined,
        criticalHigh: body.criticalHigh !== undefined && body.criticalHigh !== '' ? Number(body.criticalHigh) : undefined,
        warningLow: body.warningLow !== undefined && body.warningLow !== '' ? Number(body.warningLow) : undefined,
        criticalLow: body.criticalLow !== undefined && body.criticalLow !== '' ? Number(body.criticalLow) : undefined,
        status: 'NORMAL',
        sampleRateSec: body.sampleRateSec || 5,
        customFields: body.customFields || {}
      };

      asset.sensors.push(newSensor);
      saveDatabase();
      return sendJson(res, 201, { asset, sensor: newSensor });
    }

    // 3. Gateways API
    if (pathname === '/api/gateways' && method === 'GET') {
      return sendJson(res, 200, db.gateways);
    }

    if (pathname === '/api/gateways' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name) return sendError(res, 400, 'Gateway name is required');

      const newGateway = {
        id: `GW-${String(db.gateways.length + 1).padStart(2, '0')}`,
        name: body.name,
        model: body.model || 'Generic Industrial IoT Gateway',
        ip: body.ip || '192.168.1.100',
        mac: body.mac || '00:1E:C0:' + crypto.randomBytes(3).toString('hex').match(/../g).join(':').toUpperCase(),
        protocol: body.protocol || 'HTTP',
        port: body.port || (body.protocol === 'MQTT' ? 1883 : 8080),
        apiKey: `gw_key_${crypto.randomBytes(6).toString('hex')}`,
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        packetRate: 100,
        location: body.location || 'Main Facility',
        notes: body.notes || '',
        customFields: body.customFields || {}
      };

      db.gateways.push(newGateway);
      saveDatabase();
      return sendJson(res, 201, newGateway);
    }

    const gwIdMatch = pathname.match(/^\/api\/gateways\/([^\/]+)$/);
    if (gwIdMatch) {
      const gwId = gwIdMatch[1];
      const gwIndex = db.gateways.findIndex(g => g.id === gwId);
      if (gwIndex === -1) return sendError(res, 404, 'Gateway not found');

      if (method === 'GET') {
        const gateway = db.gateways[gwIndex];
        const connectedAssets = db.assets.filter(a => a.gatewayId === gwId);
        return sendJson(res, 200, { gateway, connectedAssets });
      }

      if (method === 'PUT') {
        const body = await parseJsonBody(req);
        db.gateways[gwIndex] = { ...db.gateways[gwIndex], ...body, id: gwId };
        saveDatabase();
        return sendJson(res, 200, db.gateways[gwIndex]);
      }

      if (method === 'DELETE') {
        const removed = db.gateways.splice(gwIndex, 1)[0];
        saveDatabase();
        return sendJson(res, 200, { success: true, removed });
      }
    }

    const gwPingMatch = pathname.match(/^\/api\/gateways\/([^\/]+)\/ping$/);
    if (gwPingMatch && method === 'POST') {
      const gwId = gwPingMatch[1];
      const gateway = db.gateways.find(g => g.id === gwId);
      if (!gateway) return sendError(res, 404, 'Gateway not found');

      gateway.lastHeartbeat = new Date().toISOString();
      gateway.status = 'ONLINE';
      saveDatabase();

      return sendJson(res, 200, {
        success: true,
        gatewayId: gateway.id,
        status: 'ONLINE',
        latencyMs: Math.floor(12 + Math.random() * 24),
        timestamp: gateway.lastHeartbeat,
        message: `Gateway "${gateway.name}" is healthy & streaming telemetry.`
      });
    }

    // 4. Sensors Matrix & Status
    if (pathname === '/api/sensors/status' && method === 'GET') {
      const allSensors = [];
      db.assets.forEach(asset => {
        const gateway = db.gateways.find(g => g.id === asset.gatewayId);
        asset.sensors.forEach(sensor => {
          allSensors.push({
            sensorId: sensor.id,
            sensorName: sensor.name,
            sensorType: sensor.type,
            unit: sensor.unit,
            currentValue: sensor.currentValue,
            status: sensor.status,
            warningHigh: sensor.warningHigh,
            criticalHigh: sensor.criticalHigh,
            warningLow: sensor.warningLow,
            criticalLow: sensor.criticalLow,
            sampleRateSec: sensor.sampleRateSec,
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.tag,
            assetLocation: asset.location,
            assetCriticality: asset.criticality,
            gatewayId: asset.gatewayId,
            gatewayName: gateway ? gateway.name : 'Unassigned',
            customFields: sensor.customFields || {}
          });
        });
      });
      return sendJson(res, 200, allSensors);
    }

    // 5. Telemetry Trends
    if (pathname === '/api/telemetry/history' && method === 'GET') {
      const query = parsedUrl.query;
      const assetId = query.assetId;
      const sensorType = query.sensorType;
      const timeframe = query.timeframe || '24h';

      let filtered = [...db.telemetryHistory];
      if (assetId) filtered = filtered.filter(t => t.assetId === assetId);
      if (sensorType) filtered = filtered.filter(t => t.sensorType === sensorType);

      const now = Date.now();
      let durationMs = 24 * 3600 * 1000;
      if (timeframe === '1h') durationMs = 3600 * 1000;
      else if (timeframe === '7d') durationMs = 7 * 24 * 3600 * 1000;
      else if (timeframe === '30d') durationMs = 30 * 24 * 3600 * 1000;

      const cutoff = new Date(now - durationMs).toISOString();
      const results = filtered.filter(t => t.timestamp >= cutoff);

      let stats = null;
      if (results.length > 0) {
        const values = results.map(r => r.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = +(sum / values.length).toFixed(2);
        const min = Math.min(...values);
        const max = Math.max(...values);
        stats = { count: values.length, mean, min, max };
      }

      return sendJson(res, 200, { results, stats, timeframe });
    }

    // 6. External Ingestion
    if (pathname === '/api/telemetry/ingest' && method === 'POST') {
      const body = await parseJsonBody(req);
      const readings = Array.isArray(body.readings) ? body.readings : (body.assetId ? [body] : []);

      if (readings.length === 0) {
        return sendError(res, 400, 'No telemetry readings found in payload');
      }

      const processed = [];
      readings.forEach(r => {
        const resObj = processTelemetryReading(r);
        if (resObj) processed.push(resObj);
      });

      saveDatabase();
      return sendJson(res, 200, {
        success: true,
        ingestedCount: processed.length,
        timestamp: new Date().toISOString()
      });
    }

    // 7. Alarms API
    if (pathname === '/api/alarms' && method === 'GET') {
      return sendJson(res, 200, db.alarms);
    }

    const almAckMatch = pathname.match(/^\/api\/alarms\/([^\/]+)\/acknowledge$/);
    if (almAckMatch && method === 'POST') {
      const alarmId = almAckMatch[1];
      const alarm = db.alarms.find(a => a.id === alarmId);
      if (!alarm) return sendError(res, 404, 'Alarm not found');

      alarm.status = 'ACKNOWLEDGED';
      alarm.acknowledgedBy = 'Duty Operator (Field Tech)';
      alarm.acknowledgedAt = new Date().toISOString();
      saveDatabase();
      return sendJson(res, 200, alarm);
    }

    const almResolveMatch = pathname.match(/^\/api\/alarms\/([^\/]+)\/resolve$/);
    if (almResolveMatch && method === 'POST') {
      const alarmId = almResolveMatch[1];
      const alarm = db.alarms.find(a => a.id === alarmId);
      if (!alarm) return sendError(res, 404, 'Alarm not found');

      alarm.status = 'RESOLVED';
      alarm.resolvedAt = new Date().toISOString();

      const asset = db.assets.find(a => a.id === alarm.assetId);
      if (asset) {
        const otherActive = db.alarms.some(a => a.assetId === asset.id && a.id !== alarmId && a.status === 'ACTIVE');
        if (!otherActive) {
          asset.status = 'HEALTHY';
          asset.stateflowState = 'RESOLVED';
        }
      }

      saveDatabase();
      return sendJson(res, 200, alarm);
    }

    const almDispatchMatch = pathname.match(/^\/api\/alarms\/([^\/]+)\/dispatch-facilio$/);
    if (almDispatchMatch && method === 'POST') {
      const alarmId = almDispatchMatch[1];
      const alarm = db.alarms.find(a => a.id === alarmId);
      if (!alarm) return sendError(res, 404, 'Alarm not found');

      const dispatchResult = dispatchAlarmToFacilio(alarm);
      return sendJson(res, 200, { success: true, alarm, ...dispatchResult });
    }

    // 8. Facilio CAFM Configuration & Logs
    if (pathname === '/api/facilio/config' && method === 'GET') {
      return sendJson(res, 200, db.facilioConfig);
    }

    if (pathname === '/api/facilio/config' && method === 'POST') {
      const body = await parseJsonBody(req);
      db.facilioConfig = { ...db.facilioConfig, ...body };
      saveDatabase();
      return sendJson(res, 200, db.facilioConfig);
    }

    if (pathname === '/api/facilio/logs' && method === 'GET') {
      return sendJson(res, 200, db.facilioLogs);
    }

    if (pathname === '/api/facilio/test-connection' && method === 'POST') {
      return sendJson(res, 200, {
        success: true,
        baseUrl: db.facilioConfig.baseUrl,
        orgId: db.facilioConfig.orgId,
        siteId: db.facilioConfig.siteId,
        latencyMs: 48,
        status: 'CONNECTED',
        message: 'Successfully authenticated with Facilio CAFM API v3 (Connected Building Suite).'
      });
    }

    if (pathname === '/api/facilio/dispatch' && method === 'POST') {
      const body = await parseJsonBody(req);
      const ticketId = `WO-FAC-${Math.floor(10000 + Math.random() * 90000)}`;

      const logEntry = {
        id: `FCL-LOG-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        action: 'CREATE_WORK_ORDER',
        assetId: body.assetId || 'AST-MANUAL',
        assetName: body.assetName || 'Manual Work Order Dispatch',
        facilioTicketId: ticketId,
        status: 'SUCCESS',
        requestPayload: {
          module: 'workorder',
          data: body
        },
        responsePayload: {
          code: 201,
          message: 'Work Order created in Facilio CAFM',
          workOrderId: ticketId,
          ticketNumber: `#${ticketId}`,
          assignedGroup: body.assignedGroup || 'Facility Maintenance Team'
        }
      };

      db.facilioLogs.unshift(logEntry);
      saveDatabase();
      return sendJson(res, 201, { success: true, workOrderId: ticketId, log: logEntry });
    }

    // 9. Custom Fields API
    if (pathname === '/api/custom-fields' && method === 'GET') {
      return sendJson(res, 200, db.customFields);
    }

    if (pathname === '/api/custom-fields' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.label || !body.entity) {
        return sendError(res, 400, 'Field label and entity (ASSET, SENSOR, GATEWAY) are required');
      }

      const key = body.key || body.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const newField = {
        id: `CF-${String(db.customFields.length + 1).padStart(3, '0')}`,
        entity: body.entity,
        label: body.label,
        key: key,
        type: body.type || 'text',
        options: body.options || [],
        required: !!body.required,
        defaultValue: body.defaultValue || ''
      };

      db.customFields.push(newField);
      saveDatabase();
      return sendJson(res, 201, newField);
    }

    const cfIdMatch = pathname.match(/^\/api\/custom-fields\/([^\/]+)$/);
    if (cfIdMatch && method === 'DELETE') {
      const fieldId = cfIdMatch[1];
      db.customFields = db.customFields.filter(f => f.id !== fieldId);
      saveDatabase();
      return sendJson(res, 200, { success: true, fieldId });
    }

    // 10. Process Flow & Stateflows
    if (pathname === '/api/stateflows' && method === 'GET') {
      return sendJson(res, 200, db.stateflows);
    }

    if (pathname === '/api/stateflows' && method === 'POST') {
      const body = await parseJsonBody(req);
      const newFlow = {
        id: `STF-${String(db.stateflows.length + 1).padStart(3, '0')}`,
        name: body.name || 'Custom Stateflow',
        description: body.description || '',
        isDefault: !!body.isDefault,
        states: body.states || [],
        transitions: body.transitions || []
      };
      db.stateflows.push(newFlow);
      saveDatabase();
      return sendJson(res, 201, newFlow);
    }

    if (pathname === '/api/stateflows/trigger-transition' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { assetId, targetState } = body;
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return sendError(res, 404, 'Asset not found');

      const prevState = asset.stateflowState;
      asset.stateflowState = targetState;

      let extraAction = null;
      if (targetState === 'CRITICAL' || targetState === 'TICKET_DISPATCHED') {
        let alarm = db.alarms.find(a => a.assetId === asset.id && a.status === 'ACTIVE');
        if (!alarm) {
          alarm = {
            id: `ALM-${Math.floor(1000 + Math.random() * 9000)}`,
            assetId: asset.id,
            assetName: asset.name,
            sensorId: asset.sensors[0]?.id || 'SNS-SYS',
            sensorType: asset.sensors[0]?.type || 'system',
            severity: 'CRITICAL',
            message: `Manual state transition triggered to ${targetState}`,
            triggerValue: 99.9,
            threshold: 50.0,
            timestamp: new Date().toISOString(),
            status: 'ACTIVE',
            acknowledgedBy: null,
            facilioTicketId: null,
            facilioSyncTime: null
          };
          db.alarms.unshift(alarm);
        }
        if (targetState === 'TICKET_DISPATCHED' && !alarm.facilioTicketId) {
          extraAction = dispatchAlarmToFacilio(alarm);
        }
      } else if (targetState === 'RESOLVED' || targetState === 'NORMAL') {
        asset.status = 'HEALTHY';
        db.alarms.filter(a => a.assetId === asset.id && a.status !== 'RESOLVED').forEach(a => {
          a.status = 'RESOLVED';
          a.resolvedAt = new Date().toISOString();
        });
      }

      saveDatabase();
      return sendJson(res, 200, {
        success: true,
        assetId: asset.id,
        prevState,
        currentState: targetState,
        extraAction
      });
    }

    // 11. Simulator API
    if (pathname === '/api/simulator' && method === 'GET') {
      return sendJson(res, 200, db.simulatorConfig);
    }

    if (pathname === '/api/simulator/toggle' && method === 'POST') {
      db.simulatorConfig.running = !db.simulatorConfig.running;
      saveDatabase();
      return sendJson(res, 200, db.simulatorConfig);
    }

    if (pathname === '/api/simulator/inject-fault' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { assetId, sensorType, value, faultName } = body;
      
      const fault = {
        id: `FLT-${Date.now().toString().slice(-4)}`,
        assetId: assetId || 'AST-101',
        sensor: sensorType || 'temperature',
        value: Number(value || 92.5),
        faultName: faultName || 'Overheat Failure Simulation',
        timestamp: new Date().toISOString()
      };

      db.simulatorConfig.activeFaults = db.simulatorConfig.activeFaults.filter(f => f.assetId !== fault.assetId);
      db.simulatorConfig.activeFaults.push(fault);

      processTelemetryReading({
        assetId: fault.assetId,
        sensorType: fault.sensor,
        value: fault.value,
        timestamp: fault.timestamp
      });

      saveDatabase();
      return sendJson(res, 200, { success: true, fault, simulator: db.simulatorConfig });
    }

    if (pathname === '/api/simulator/clear-faults' && method === 'POST') {
      db.simulatorConfig.activeFaults = [];
      db.assets.forEach(asset => {
        asset.status = 'HEALTHY';
        asset.stateflowState = 'NORMAL';
        asset.sensors.forEach(s => {
          s.status = 'NORMAL';
          if (s.type === 'temperature') s.currentValue = 12.0;
          if (s.type === 'vibration') s.currentValue = 1.8;
          if (s.type === 'pressure') s.currentValue = 6.2;
          if (s.type === 'current') s.currentValue = 150.0;
          if (s.type === 'humidity') s.currentValue = 50.0;
        });
      });
      saveDatabase();
      return sendJson(res, 200, { success: true, message: 'All simulation faults cleared and assets normalized.' });
    }

    // 12. Users API
    if (pathname === '/api/users' && method === 'GET') {
      return sendJson(res, 200, db.users);
    }

    if (pathname === '/api/users' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.email) return sendError(res, 400, 'Name and email are required');

      const newUser = {
        id: `USR-${String(db.users.length + 1).padStart(2, '0')}`,
        name: body.name,
        email: body.email,
        role: body.role || 'OPERATOR',
        department: body.department || 'Facility Management',
        status: 'ACTIVE'
      };
      db.users.push(newUser);
      saveDatabase();
      return sendJson(res, 201, newUser);
    }

    const userIdMatch = pathname.match(/^\/api\/users\/([^\/]+)$/);
    if (userIdMatch && method === 'DELETE') {
      const userId = userIdMatch[1];
      db.users = db.users.filter(u => u.id !== userId);
      saveDatabase();
      return sendJson(res, 200, { success: true, userId });
    }

  } catch (err) {
    console.error('[API ERROR]', pathname, err);
    return sendError(res, 500, 'Internal Server Error: ' + err.message);
  }

  if (method === 'GET') {
    return serveStaticFile(req, res, pathname);
  }

  return sendError(res, 404, 'Endpoint Not Found');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  BERKELEY SENSEIOT - IoT Asset Monitoring Portal  `);
  console.log(`  Defined by Trust • Powered by Node.js            `);
  console.log(`  Listening on: http://localhost:${PORT}             `);
  console.log(`====================================================`);
});
