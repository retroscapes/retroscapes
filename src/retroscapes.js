/**
 * The retroscapes library helps define and build isometric renderings of
 * procedurally generated landscapes, with particular support for the HTML
 * Canvas API.
 *
 * Version: 0.1.0
 * Web: https://github.com/retroscapes
 */
(function(global) {
  'use strict';

  function sha256(input) {
    const rotr = function (v, a) { return (v >>> a) | (v << (32 - a)); };
    const mod2to32 = Math.pow(2, 32), int32s = [], bitLength = input.length * 8;
    const k = [
      1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993, -1841331548, -1424204075,
      -670586216, 310598401, 607225278, 1426881987, 1925078388, -2132889090, -1680079193, -1046744716,
      -459576895, -272742522, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
      -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585, 113926993, 338241895,
      666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, -2117940946, -1838011259,
      -1564481375, -1474664885, -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
      430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779,
      1955562222, 2024104815, -2067236844, -1933114872, -1866530822, -1538233109, -1090935817, -965641998
    ];
    var d = [
      1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225,
      -876896931, 1654270250, -1856437926, 355462360, 1731405415, -1900787065, -619958771, 1203062813,
      -1369468586, -814971437, 796084093, 1830299338, -1958489001, -480201322, 474308610, 1863934769,
      -649150799, 214214161, 639484402, 1477814206, 1891102055, -1588511639, 1157183029, 1913507325,
      -1268304226, -902689931, 887149614, 1237834173, -2018788878, -1000103172, -331365389, 656899949,
      1628171250, 1948300446, -771913165, -461949548, 153196534, 458427541, -2036505790, -286970289,
      285697673, 570139515, 1135321014, 1974073629, -2043654119, -674397837, 134086911, 933187903,
      1723224488, 1984608322, -1531941919, -1017672683, -761910701, 503553856, -2055504914, -1566838050
    ];
    var i, j;

    if (input instanceof Uint8Array) {
      var bytes = Array.from(input);
      bytes.push(128);
      while (bytes.length % 64 - 56) {
        bytes.push(0);
      }
      input = new Uint8Array(bytes);
    } else {
      input += '\x80';
      while (input.length % 64 - 56) {
        input += '\x00';
      }
    }

    for (i = 0; i < input.length; i++) {
      j = (input instanceof Uint8Array) ? input[i] : input.charCodeAt(i);
      int32s[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    int32s[int32s.length] = (bitLength / mod2to32) | 0;
    int32s[int32s.length] = (bitLength);

    for (j = 0; j < int32s.length;) {
      const w = int32s.slice(j, j += 16);
      const d_ = d;
      d = d.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j, w15 = w[i - 15], w2 = w[i - 2], a = d[0], e = d[4];
        const t1 =
          d[7] +
          (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & d[5]) ^ ((~e) & d[6])) +
          k[i] + (
            w[i] =
              (i < 16) ?
                w[i] :
                  ((
                    w[i - 16] + (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) +
                    w[i - 7] + (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10))
                  ) | 0)
          );
        const t2 =
          (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & d[1]) ^ (a & d[2]) ^ (d[1] & d[2]));
        d = [(t1 + t2) | 0].concat(d);
        d[4] = (d[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) {
        d[i] = (d[i] + d_[i]) | 0;
      }
    }

    var output = new Uint8Array(8*4), c = 0;
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        output[c++] = (d[i] >> (j * 8)) & 255;
      }
    }
    return output;
  }

  class FeedSimple extends Uint8Array {
    constructor(length) {
      super(length);
      var a = sha256('0');
      var index = 0;
      for (var i = 0; i < length; i++) {
        this[i] = a[index];
        if (index == 32) {
          index = 0;
          a = sha256(''+i);
        }
        index++;
      }

      this.state = 0;
    }

    next() {
      var r = this[this.state];
      this.state = (this.state == this.length - 1) ? 0 : this.state + 1;
      return r / 255;
    }
  }

  class FeedCell extends Uint8Array {
    randReal(vs) {
      var index = vs[0] * 17;
      for (var i = 1; i < vs.length; i++) {
        if (i % 2 == 0) {
          index += 7 * vs[i];
        } else {
          index *= 3 * vs[i];
        }
      }
      return this[Math.abs(Math.floor(index)) % this.length] / 255;
    }

    randReals(n) {
      var rs = [];
      for (var i = 0; i < n; i++) {
        rs.push(this[i] / 255);
      }
      return rs;
    }

    randBoolWithProb(probability, offset) {
      offset = (offset == null) ? 0 : offset;
      return (((this[offset] + (this[offset] == 0 ? 1 : 0)) * 37) % 256) < (probability * 256);
    }
  }

  class FeedRegion {
    center() {
      return this[0][0];
    }

    randReal(vs) {
      return this[0][0].randReal(vs);
    }

    randBoolWithProb(probability, offset) {
      return this[0][0].randBoolWithProb(probability, offset);
    }

    relative(x, y) {
      return this[x][y];
    }

    up() {
      return this[-1][-1];
    }

    down() {
      return this[1][1];
    }

    left() {
      return this[-1][1];
    }

    right() {
      return this[1][-1];
    }

    countOnRing(p) {
      var c = 0;
      c += p(this[0][-1]) ? 1 : 0;
      c += p(this[1][-1]) ? 1 : 0;
      c += p(this[1][0]) ? 1 : 0;
      c += p(this[1][1]) ? 1 : 0;
      c += p(this[0][1]) ? 1 : 0;
      c += p(this[-1][1]) ? 1 : 0;
      c += p(this[-1][0]) ? 1 : 0;
      c += p(this[-1][-1]) ? 1 : 0;
      return c;
    }

    countAround(p) {
      const d = 2;
      var c = 0;
      for (var dx = -d; dx < d; dx++) {
        for (var dy = -d; dy < d; dy++) {
          if ((dx != 0 || dy != 0) && p(this[dx][dy])) {
            c += 1;
          }
        }
      }
      return c;
    }

    countOnAxes(p) {
      var c = 0;
      c += p(this[0][-1]) ? 1 : 0;
      c += p(this[1][0]) ? 1 : 0;
      c += p(this[0][1]) ? 1 : 0;
      c += p(this[-1][0]) ? 1 : 0;
      return c;
    }

    allOnAxes(p) {
      return this.countOnAxes(p) == 4;
    }

    noneOnAxes(p) {
      return this.countOnAxes(p) == 0;
    }

    noneAround(p) {
      return this.countAround(p) == 0;
    }
  }

  class Feed {
    constructor(configuration) {
      this.xPos = [sha256('a')];
      this.xNeg = [sha256('b')];
      this.yPos = [sha256('c')];
      this.yNeg = [sha256('d')];
      this.configuration = configuration;
      this.cacheFeedCells = {};
      this.cacheFeedRegions = {};
    }

    at(coordinates, quantity) {
      var xs = (coordinates.x < 0) ? this.xNeg : this.xPos;
      var ys = (coordinates.y < 0) ? this.yNeg : this.yPos;

      for (var i = xs.length; i <= Math.abs(coordinates.x); i++) {
        xs.push(sha256(xs[i - 1]));
      }
      for (var i = ys.length; i <= Math.abs(coordinates.y); i++) {
        ys.push(sha256(ys[i - 1]));
      }

      // For quantities beyond 32^2, the sequence will repeat.
      var rs = new FeedCell(32), j = 0;
      for (var i = 0; i < quantity; i++) {
        rs[i] = (
          xs[Math.abs(coordinates.x)][i % 32] +
          ys[Math.abs(coordinates.y)][(i + j) % 32]
        ) % 256;
        if (i % 32 == 31) {
          j = (j + 1) % 32;
        }
      }
      return rs;
    }

    around(coordinates, d) {
      var t = 0, c = 0;
      for (var x = coordinates.x - d; x < coordinates.x + d; x++) {
        for (var y = coordinates.y - d; y < coordinates.y + d; y++) {
          var r = this.at({"x": x, "y": y}, 1);
          t += (isNaN(r[0]) ? 0 : r[0]);
          c += (isNaN(r[0]) ? 0 : 1);
        }
      }
      return Math.min(Math.floor(t / c), 255);
    }

    nearest(coordinates) {
      const quantity = this.configuration.quantity;
      const d = this.configuration.d;
      const pAnchor = this.configuration.pAnchor;
      const pTethered = this.configuration.pTethered;
      var dist = null;
      var r = this.at(coordinates, quantity);
      var r0 = r[0] + (r[0] == 0 ? 1 : 0);
      const tethered = ((r0 * 17) % 256) < (pTethered * 256);
      if (((r0 * 103) % 256) < (pAnchor * 256)) {
        return r;
      }
      for (var x = coordinates.x - d; x < coordinates.x + d; x++) {
        for (var y = coordinates.y - d; y < coordinates.y + d; y++) {
          var o = this.at({"x": x, "y": y}, quantity);
          if (((((o[0] + (o[0] == 0 ? 1 : 0)) * 103) % 256) < (pAnchor * 256)) &&
              tethered
          ) {
            var d_ = Math.pow(coordinates.x - x, 2) + Math.pow(coordinates.y - y, 2);
            if (dist == null || d_ < dist) {
              r = o;
              dist = d_;
            }
          }
        }
      }
      return r;
    }

    feedCellAt(coordinates) {
      const cacheKey = coordinates.toCSV();
      var fc = this.cacheFeedCells[cacheKey];
      if (fc == null) {
        fc = this.nearest(coordinates);
        this.cacheFeedCells[cacheKey] = fc;
      }
      return fc;
    }

    feedRegionAt(coordinates) {
      const x = coordinates.x, y = coordinates.y;
      const cacheKey = coordinates.toCSV();
      if (cacheKey in this.cacheFeedRegions) {
        return this.cacheFeedRegions[cacheKey];
      } else {
        var fr = new FeedRegion();

        for (var dx = -2; dx <= 2; dx++) {
          fr[dx] = {};
          for (var dy = -2; dy <= 2; dy++) {
            fr[dx][dy] = this.feedCellAt(new Vector({"x": x + dx, "y": y + dy}));
          }
        }

        this.cacheFeedRegions[cacheKey] = fr;
        return fr;
      }
    }
  }

  class Anchors {
    constructor(period, probability, radius) {
      this.feed = new FeedSimple(period * period * 20);
      this.period = period;
      this.radius =
        Array.isArray(radius) ?
          radius :
            [0, radius];

      const dist = function(x1, y1, x2, y2) {
        return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
      }

      this.anchors = [];
      for (var i = 0; i < this.period; i++) {
        for (var j = 0; j < this.period; j++) {
          if (this.feed.next() < probability) {
            this.anchors.push({
              "x": i, "y": j, "r": this.radius[0] + this.feed.next() * this.radius[1]
            });
          }
        }
      }

      this.cache = {};
      for (var i = 0; i < this.period; i++) {
        for (var j = 0; j < this.period; j++) {
          var closest = 0;
          var dist_ = dist(this.anchors[0].x, this.anchors[0].y, i, j);
          for (var k = 0; k < this.anchors.length; k++) {
            var dist__ = dist(this.anchors[k].x, this.anchors[k].y, i, j);
            if (dist__ < dist_) {
              closest = k;
              dist_ = dist__;
            }
          }
          this.cache[i + "," + j] = {
            "distance": Math.sqrt(dist_),
            "radius": this.anchors[closest].r
          };
        }
      }
    }

    closest(coordinates) {
      const mod_ = function (x, n) { return ((x % n) + n) % n; };
      const x = mod_(coordinates.x, this.period);
      const y = mod_(coordinates.y, this.period);
      return this.cache[x + "," + y];
    }

    anchored(coordinates) {
      const anchor = this.closest(coordinates);
      return anchor.distance < anchor.radius;
    }
  }

  class Scalar {
    static bounded(s, lo, hi) {
      return Math.min(hi, Math.max(lo, s));
    }
  }

  class Vector {
    constructor(o) {
      this.update(o);
    }

    update(o) {
      for (var attribute in o) {
        this[attribute] = o[attribute];
      }
    }

    toCSV() {
      var vs = [];
      for (var attribute in this) {
        const value = this[attribute];
        if (!isNaN(value)) {
          vs.push(value);
        }
      }
      return vs.join(",");
    }

    add(other) {
      return new Vector({"x": this.x + other.x, "y": this.y + other.y});
    }

    sub(other) {
      return new Vector({"x": this.x - other.x, "y": this.y - other.y});
    }

    magnitude() {
      return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }
  }

  class Color extends Array {
    constructor(parameter) {
      super();

      // Convert hex color code.
      if (typeof parameter === 'string' || parameter instanceof String) {
        parameter = Color.fromHex(parameter);
      }

      for (var i = 0; i < parameter.length; i++) {
        this.push(parameter[i]);
      }

      // Add an opacity value if it is not present.
      if (this.length == 3) {
        this.push(1.0);
      }
    }

    static hexCharCodeToIntAt(s, i) {
      var c = s.charCodeAt(i);
      return (c >= 48 && c < 58) ? c - 48 : c - 87;
    }

    static fromHex(h) {
      h = h.toLowerCase();
      return [
        (Color.hexCharCodeToIntAt(h, 1) * 16) + Color.hexCharCodeToIntAt(h, 2),
        (Color.hexCharCodeToIntAt(h, 3) * 16) + Color.hexCharCodeToIntAt(h, 4),
        (Color.hexCharCodeToIntAt(h, 5) * 16) + Color.hexCharCodeToIntAt(h, 6)
      ];
    }

    static rgbRandom() {
      return Color([
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        255
      ]);
    }

    static max(c1, c2) {
      return new Color([
        Math.max(c1[0], c2[0]),
        Math.max(c1[1], c2[1]),
        Math.max(c1[2], c2[2]),
        Math.max(c1[3], c2[3])
      ]);
    }

    nearby(d, rs) {
      return new Color([
        Math.min(255, Math.max(0, Math.floor(this[0] - d + (2 * d * rs[0])))),
        Math.min(255, Math.max(0, Math.floor(this[1] - d + (2 * d * rs[1])))),
        Math.min(255, Math.max(0, Math.floor(this[2] - d + (2 * d * rs[2])))),
        this[3]
      ]);
    }

    darker(p) {
      return new Color([
        Math.max(0, this[0] - Math.floor((this[0] * p) / 100)),
        Math.max(0, this[1] - Math.floor((this[1] * p) / 100)),
        Math.max(0, this[2] - Math.floor((this[2] * p) / 100)),
        this[3]
      ]);
    }

    lighter(p) {
      return new Color([
        Math.min(255, this[0] + Math.floor(((255-this[0])*p)/100)),
        Math.min(255, this[1] + Math.floor(((255-this[1])*p)/100)),
        Math.min(255, this[2] + Math.floor(((255-this[2])*p)/100)),
        this[3]
      ]);
    }

    lighterOrDarker(p, l) {
      if (l == null || l == true) {
        return p > 0 ? this.lighter(Math.abs(p)) : this.darker(Math.abs(p));
      } else {
        return this;
      }
    };

    rgb() {
      return 'rgb(' + [
        this[0],
        this[1],
        this[2]
      ].join(",") + ')';
    };

    rgba(c) {
      return 'rgba(' + (
        (c == null) ?
            [this[0], this[1], this[2], this[3]] :
            [
              (c.r == null) ? this[0] : c.r,
              (c.g == null) ? this[1] : c.g,
              (c.b == null) ? this[2] : c.b,
              (c.a == null) ? this[3] : c.a
            ]
      ).join(",") + ')';
    }
  }

  class Look {
    constructor(o) {
      for (var a in o) {
        this[a] = o[a];
      }
    }

    looks(order) {
      return [this, this, this];
    }

    setFace(f) {
      this.face = f;
    }

    setFaceColor(c) {
      if (this.face == null) {
        this.face = {"color": c};
      } else {
        this.face.color = c;
      }
    }

    setFaceColor_(c) {
      this.face.color = c;
    }

    setEdge(e) {
      this.edge = e;
    }

    setEdgeColor(c) {
      if (this.edge == null) {
        this.edge = {"color": c, "lineWidth": 1, "lineDash": []};
      } else {
        this.edge.color = c;
      }
    }

    setEdgeColor_(c) {
      this.edge.color = c;
    }

    setSpot(s) {
      this.spot = s;
    }

    setSpotColor(c) {
      if (this.spot == null) {
        this.spot = {"color": c, "quantity": 30, "size": 0.03};
      } else {
        this.spot.color = c;
      }
    }

    setSpotColor_(c) {
      this.spot.color = c;
    }

    setLine(l) {
      this.line = l;
    }

    setLineColor(c) {
      if (this.line == null) {
        this.line = {"color": c, "lineWidth": 1, "quantity": 3};
      } else {
        this.line.color = c;
      }
    }

    setLineColor_(c) {
      this.line.color = c;
    }

    setPattern(p) {
      this.pattern = p;
    }

    _within(color, within, fx, args) {
      const range = parseInt(within.slice(0, -1));
      var scale = 100 - (range / 2) + Math.round(fx.randReal(args) * range);
      var cs = [];
      for (var i = 0; i < color.length; i++) {
        if (i < 3) {
          cs.push(Scalar.bounded(color[i] * (scale / 100), 0, 255));
        } else {
          cs.push(color[i]);
        }
      }
      return cs;
    }

    emitFaceColor(fx, args) {
      if (this.face.within != null) {
        return this._within(this.face.color, this.face.within, fx, args);
      }
      return this.face.color;
    }

    emitFacePatternColor(r, c, fx, args) {
      args = (args == null) ? [] : args;
      return this.emitFaceColor(fx, [r, c].concat(args));
    }
  }

  class Looks {
    constructor(components) {
      for (var a in components) {
        this[a] = new Look(components[a]);
      }
    }

    looks(order) {
      return [this.mesial, this.lateral, this.top];
    }

    _defaultComponents() {
      if (this.mesial == null) {
        this.mesial = {};
      }
      if (this.lateral == null) {
        this.lateral = {};
      }
      if (this.top == null) {
        this.top = {};
      }
    }

    _defaultComponentsAttribute(attribute, o) {
      this._defaultComponents();
      if (this.mesial[attribute] == null) {
        this.mesial[attribute] = JSON.parse(JSON.stringify(o));
      }
      if (this.lateral[attribute] == null) {
        this.lateral[attribute] = JSON.parse(JSON.stringify(o));
      }
      if (this.top[attribute] == null) {
        this.top[attribute] = JSON.parse(JSON.stringify(o));
      }
    }

    setFace(f) {
      this._defaultComponents();
      this.mesial.face = JSON.parse(JSON.stringify(f));
      this.lateral.face = JSON.parse(JSON.stringify(f));
      this.top.face = JSON.parse(JSON.stringify(f));
    }

    setFace_(f) {
      this.mesial.face = f;
      this.lateral.face = JSON.parse(JSON.stringify(f));
      this.top.face = JSON.parse(JSON.stringify(f));
    }

    setFaceColor(c) {
      this._defaultComponentsAttribute("face", {});
      this.mesial.face.color = new Color(c);
      this.lateral.face.color = new Color(c);
      this.top.face.color = new Color(c);
    }

    setFaceColor_(c) {
      this.mesial.face.color = c;
      this.lateral.face.color = new Color(c);
      this.top.face.color = new Color(c);
    }

    setEdge(e) {
      this._defaultComponents();
      this.mesial.edge = JSON.parse(JSON.stringify(e));
      this.lateral.edge = JSON.parse(JSON.stringify(e));
      this.top.edge = JSON.parse(JSON.stringify(e));
    }

    setEdge_(e) {
      this.mesial.edge = e;
      this.lateral.edge = JSON.parse(JSON.stringify(e));
      this.top.edge = JSON.parse(JSON.stringify(e));
    }

    setEdgeColor(c) {
      this._defaultComponentsAttribute("edge", {"lineWidth": 1, "lineDash": []});
      this.mesial.edge.color = new Color(c);
      this.lateral.edge.color = new Color(c);
      this.top.edge.color = new Color(c);
    }

    setEdgeColor_(c) {
      this.mesial.edge.color = c;
      this.lateral.edge.color = new Color(c);
      this.top.edge.color = new Color(c);
    }

    setSpot(s) {
      this._defaultComponents();
      this.mesial.spot = JSON.parse(JSON.stringify(s));
      this.lateral.spot = JSON.parse(JSON.stringify(s));
      this.top.spot = JSON.parse(JSON.stringify(s));
    }

    setSpot_(s) {
      this.mesial.spot = s;
      this.lateral.spot = JSON.parse(JSON.stringify(s));
      this.top.spot = JSON.parse(JSON.stringify(s));
    }

    setSpotColor(c) {
      this._defaultComponentsAttribute("spot", {"quantity": 30, "size": 0.03});
      this.mesial.spot.color = new Color(c);
      this.lateral.spot.color = new Color(c);
      this.top.spot.color = new Color(c);
    }

    setSpotColor_(c) {
      this.mesial.spot.color = c;
      this.lateral.spot.color = new Color(c);
      this.top.spot.color = new Color(c);
    }

    setLine(l) {
      this._defaultComponents();
      this.mesial.line = JSON.parse(JSON.stringify(l));
      this.lateral.line = JSON.parse(JSON.stringify(l));
      this.top.line = JSON.parse(JSON.stringify(l));
    }

    setLine_(l) {
      this.mesial.line = l;
      this.lateral.line = JSON.parse(JSON.stringify(l));
      this.top.line = JSON.parse(JSON.stringify(l));
    }

    setLineColor(c) {
      this._defaultComponentsAttribute("line", {"lineWidth": 1, "quantity": 3});
      this.mesial.line.color = new Color(c);
      this.lateral.line.color = new Color(c);
      this.top.line.color = new Color(c);
    }

    setLineColor_(c) {
      this.mesial.line.color = c;
      this.lateral.line.color = new Color(c);
      this.top.line.color = new Color(c);
    }

    setPattern(p) {
      this._defaultComponents();
      this.mesial.pattern = JSON.parse(JSON.stringify(p));
      this.lateral.pattern = JSON.parse(JSON.stringify(p));
      this.top.pattern = JSON.parse(JSON.stringify(p));
    }

    setPattern_(p) {
      this.mesial.pattern = p;
      this.lateral.pattern = JSON.parse(JSON.stringify(p));
      this.top.pattern = JSON.parse(JSON.stringify(p));
    }
  }

  class Concept {
    constructor(o) {
      if (o != null) {
        this.$ = o;
        this.$.type = "atom";
        this.$.coordinates = new Vector((o.coordinates == null) ? {"x": 0, "y":0, "z": 0} : o.coordinates);
        this.$.scales = new Vector((o.scales == null) ? {"x": 1, "y":1, "z": 1} : o.scales);
        this.$.offsets = new Vector((o.offsets == null) ? {"x": 0, "y":0, "z": 0} : o.offsets);

        if (this.$.look != null) {
          this.$.look = (
            this.$.look.mesial == null &&
              this.$.look.lateral == null &&
              this.$.look.top == null
          ) ?
            new Look(this.$.look) :
            new Looks(this.$.look);
        }
      }
    }

    instance() {
      return new Concept(JSON.parse(JSON.stringify(this)).$);
    }

    isAtom() {
      return true;
    }

    isCompound() {
      return false;
    }

    setFace(f) {
      if (this.$.look != null) {
        this.$.look.setFace(f);
      }
    }

    setFace_(f) {
      this.$.look.setFace_(f);
    }

    setFaceColor(c) {
      if (this.$.look != null) {
        this.$.look.setFaceColor(c);
      }
    }

    setFaceColor_(c) {
      this.$.look.setFaceColor(c);
    }

    setEdge(e) {
      if (this.$.look != null) {
        this.$.look.setEdge(e);
      }
    }

    setEdge_(e) {
      this.$.look.setEdge(e);
    }

    setEdgeColor(c) {
      if (this.$.look != null) {
        this.$.look.setEdgeColor(c);
      }
    }

    setEdgeColor_(c) {
      this.$.look.setEdgeColor_(c);
    }

    setSpot(s) {
      if (this.$.look != null) {
        this.$.look.setSpot(s);
      }
    }

    setSpot_(s) {
      this.$.look.setSpot(s);
    }

    setSpotColor(c) {
      if (this.$.look != null) {
        this.$.look.setSpotColor(c);
      }
    }

    setSpotColor_(c) {
      this.$.look.setSpotColor_(c);
    }

    setLine(l) {
      if (this.$.look != null) {
        this.$.look.setLine(l);
      }
    }

    setLine_(l) {
      this.$.look.setLine(l);
    }

    setLineColor(c) {
      if (this.$.look != null) {
        this.$.look.setLineColor(c);
      }
    }

    setLineColor_(c) {
      this.$.look.setLineColor_(c);
    }

    setPattern(p) {
      if (this.$.look != null) {
        this.$.look.setPattern(p);
      }
    }

    setPattern_(p) {
      this.$.look.setPattern_(p);
    }
  }

  class Concepts extends Concept {
    constructor(o) {
      super();
      for (var a in o) {
        this[a] = o[a];
      }
      this.$ = {"type": "compound"};
    }

    isAtom() {
      return false;
    }

    isCompound() {
      return true;
    }

    instance() {
      var es = {};
      for (var a in this) {
        if (a != '$') {
          es[a] = this[a].instance();
        }
      }
      return new Concepts(es);
    }

    setFace(f) {
      for (var a in this) {
        if (this[a].setFace != null) {
          this[a].setFace(f);
        }
      }
    }

    setFace_(f) {
      for (var a in this) {
        this[a].setFace_(f);
      }
    }

    setFaceColor(c) {
      for (var a in this) {
        if (this[a].setFaceColor != null) {
          this[a].setFaceColor(c);
        }
      }
    }

    setFaceColor_(c) {
      for (var a in this) {
        this[a].setFaceColor_(c);
      }
    }

    setEdge(e) {
      for (var a in this) {
        if (this[a].setEdge != null) {
          this[a].setEdge(e);
        }
      }
    }

    setEdge_(e) {
      for (var a in this) {
        this[a].setEdge_(e);
      }
    }

    setEdgeColor(c) {
      for (var a in this) {
        if (this[a].setEdgeColor != null) {
          this[a].setEdgeColor(c);
        }
      }
    }

    setEdgeColor_(c) {
      for (var a in this) {
        this[a].setEdgeColor_(c);
      }
    }

    setSpot(s) {
      for (var a in this) {
        if (this[a].setSpot != null) {
          this[a].setSpot(s);
        }
      }
    }

    setSpot_(s) {
      for (var a in this) {
        this[a].setSpot_(s);
      }
    }

    setSpotColor(c) {
      for (var a in this) {
        if (this[a].setSpotColor != null) {
          this[a].setSpotColor(c);
        }
      }
    }

    setSpotColor_(c) {
      for (var a in this) {
        this[a].setSpotColor_(c);
      }
    }

    setLine(l) {
      for (var a in this) {
        if (this[a].setLine != null) {
          this[a].setLine(l);
        }
      }
    }

    setLine_(l) {
      for (var a in this) {
        this[a].setLine_(l);
      }
    }

    setLineColor(c) {
      for (var a in this) {
        if (this[a].setLineColor != null) {
          this[a].setLineColor(c);
        }
      }
    }

    setLineColor_(c) {
      for (var a in this) {
        this[a].setLineColor_(c);
      }
    }

    setPattern(p) {
      for (var a in this) {
        if (this[a].setPattern != null) {
          this[a].setPattern(p);
        }
      }
    }

    setPattern_(p) {
      for (var a in this) {
        this[a].setPattern_(p);
      }
    }
  }

  class Instance {
    constructor(o) {
      for (var a in o) {
        var v = o[a];
        if (a == 'look') {
          v =
            (v.mesial == null && v.lateral == null && v.top == null) ?
              new Look(v) :
              new Looks(v);
        }
        this[a] = v;
      }
    }

    looks(order) {
      return this.look.looks(order);
    }
  }

  class Scape {
    coordinates(cs) {
      return cs;
    }

    render() {
      return [];
    }
  }

  class Geometry {
    constructor(parameters) {
      this.dimensions = parameters.dimensions;
      this.orientation = parameters.orientation;
      this.unit = (parameters.unit == null) ? 30 : parameters.unit;
      this.theta = ((Math.PI/2) * this.orientation.tilt) / 90; // From profile view to top view.
      this.tilt = Math.sin(this.theta);
      this.tiltNorm = this.tilt / Math.SQRT2;
      this.uX = this.unit / Math.SQRT2;
      this.uY = this.uX * this.tilt;
      this.uZ = this.unit * Math.sin((Math.PI/2) - this.theta);
    }

    setDimensions(dimensions) {
      this.dimensions = dimensions;
    }

    aspect() {
      return this.dimensions.width / this.dimensions.height;
    }

    setCenter(coordinates) {
      this.center = new Vector(coordinates);
      this.centerGrid = this.getCenterGrid();
    }

    getCenter() {
      return (this.center != null && this.center != undefined) ?
        this.center :
        new Vector({
          "x": Math.floor(this.dimensions.width / 2),
          "y": Math.floor(this.dimensions.height / 2)
        });
    }

    getCenterGrid() {
      var center = this.getCenter();
      return this.canvasToPlaneGrid({
        "x": this.dimensions.width - center.x,
        "y": this.dimensions.height - center.y
      });
    }

    getOffsetFromCenterGrid(coordinates) {
      const center = this.getCenterGrid();
      return {
        "x": coordinates.x - center.x,
        "y": coordinates.y - center.y
      };
    }

    canvasToPlane(coordinates) {
      const x = (((coordinates.x - this.uX) - (this.dimensions.width / 2)) / (this.uX * 2));
      const y = ((coordinates.y - (this.dimensions.height / 2)) / (this.uY * 2));
      return new Vector({"x": 1 + x + y, "y": -x + y});
    }

    canvasToPlaneGrid(coordinates) {
      coordinates = this.canvasToPlane(coordinates);
      return new Vector({"x": Math.floor(coordinates.x), "y": Math.floor(coordinates.y)});
    }

    gridPlaneCellVisibleMap(func, maxHeight) {
      maxHeight = (maxHeight == null) ? 7 : maxHeight;
      const gridWidthHalf = Math.floor((this.dimensions.width / this.uX) / 2);
      const gridHeight = Math.floor(this.dimensions.height / this.uY);
      var c = this.getCenter();
      const topLeft = this.canvasToPlaneGrid({
        "x": (this.dimensions.width / 2) - c.x,
        "y": (this.dimensions.height / 2) - c.y
      });
      const heightAccountingOffset = Math.floor((maxHeight * this.uZ) / this.uY);
      for (var i = -2; i < gridHeight + 5 + heightAccountingOffset; i++) {
        for (var j = Math.floor(i/2); j < gridWidthHalf + 3 + Math.floor(i/2); j++) {
          func(new Vector({"x": topLeft.x + j, "y": topLeft.y + i - j}));
        }
      }
    }
  }

  class Effect {
    render(coordinates) {
      return true;
    }

    color(coordinates, color, edge) {
      return color;
    }
  }

  class EffectPlateSquare extends Effect {
    calc(coordinates, grid) {
      const cs = (grid) ?
        this.projection.getOffsetFromCenterGrid(coordinates) :
        this.projection.canvasToPlaneGrid(coordinates);
      cs.x -= 3;
      cs.y -= 3;
      const unit = 40 / this.projection.unit;
      var distance = Math.floor(
        0.88 * unit * (this.projection.dimensions.width / 100)
      );
      const start = 0.8;
      const end = 0.8;
      const slope = 0;
      const aDist = Math.abs((cs.y + (slope * cs.x))/(distance * end));
      const bDist = Math.abs((cs.x + (slope * cs.y))/(distance * end));
      return [start, aDist, bDist];
    }

    render(coordinates) {
      const calculated = this.calc(coordinates, true);
      const start = calculated[0], aDist = calculated[1], bDist = calculated[2];
      return (
        (aDist < start && bDist < start) ?
          true :
          Math.abs(
            (aDist > bDist) ?
              100 * ((aDist - start)/(1 - start)) :
              100 * ((bDist - start)/(1 - start))
          ) < 100
      );
    }
  }

  class Interaction {
    /** Base class for canvas interactions.
     */
  }

  class InteractionDrag extends Interaction {
    constructor() {
      super();
      this.active = false;
      this.start = null;
      this.center = null;
      this.last = {};
    }

    mousemove(e) {
      const cursor = this.canvas.getCursorPosition(e);
      if (this.active) {
        const c = this.center.add(cursor.sub(this.start));

        // Scroll only by whole grid cells.
        const du = 1;
        const p = this.canvas.projection();
        c.x = Math.floor(c.x / (p.uX * 2 * du)) * (p.uX * 2 * du);
        c.y = Math.floor(c.y / (p.uY * 2 * du)) * (p.uY * 2 * du);

        // Only change the center if an update occurred.
        if (this.last.x != c.x || this.last.y != c.y) {
          // Perform update as specified within Canvas object.
          this.canvas.update(c);
        }
        this.last = c;
      }
    }

    mousedown(e) {
      this.active = true;
      this.start = this.canvas.getCursorPosition(e);
      this.center = this.canvas.projection().getCenter();
      this.canvas.canvas.style.cursor = "grabbing";
    }

    mouseup(e) {
      this.active = false;
      this.start = null;
      this.center = null;
      this.canvas.canvas.style.cursor = "grab";
    }
  }

  class InteractionNudge extends Interaction {
    constructor(center) {
      super();
      this.center = center;
    }

    click(e) {
      // Determine the cursor position relative to the center.
      const cursor = this.canvas.getCursorPosition(e);
      const delta = cursor.sub(new Vector(this.center()));

      // Update the center based on the direction in which cursor
      // deviates from the center (ignoring distance from center).
      const p = this.canvas.projection();
      const dx = (delta.x > (p.uX * 2)) ? 1 : ((delta.x < (-p.uX * 2)) ? -1 : 0);
      const dy = (delta.y > (p.uY * 2)) ? 1 : ((delta.y < (-p.uY * 2)) ? -1 : 0);
      const c = p.getCenter();
      c.x = Math.round((c.x + (p.uX * 2 * dx)) / (p.uX * 2)) * (p.uX * 2);
      c.y = Math.round((c.y + (p.uY * 2 * dy)) / (p.uY * 2)) * (p.uY * 2);

      // Perform update as specified within Canvas object.
      this.canvas.update(c);
    }
  }

  class Cache {
    constructor(parameters) {
      this.time = (parameters.time == null) ? 100 : parameters.time;
      this.scapes = [];
    }

    initialize(n) {
      for (var i = 0; i < n; i++) {
        this.scapes.push({});
      }
    }

    update(i, key, es) {
      this.scapes[i][key] = {
        "es": es,
        "time": this.time
      }
    }

    lookup(i, key) {
      if (key in this.scapes[i]) {
        return this.scapes[i][key];
      }
    }

    refresh() {
      for (var i = 0; i < this.scapes.length; i++) {
        for (var j in this.scapes[i]) {
          this.scapes[i][j].time -= 1;
          if (this.scapes[i][j].time <= 0) {
            delete this.scapes[i][j];
          }
        }
      }
    }
  }

  // Wrapper class for a canvas element.
  class Canvas {
    constructor(canvas, projection, update, interactions) {
      this.projection = projection;
      this.canvas = canvas;
      this.update = update;

      this._lastMouseDownEvent = null;

      const self = this;

      // Add standard event listeners.
      this.canvas.addEventListener('mousemove', function(e) { self.eventOnMouseMove(e); });
      this.canvas.addEventListener('mousedown', function(e) { self.eventOnMouseDown(e); });
      this.canvas.addEventListener('mouseup', function(e) { self.eventOnMouseUp(e); });

      // Initialize interactions.
      this.interactions = interactions;
      for (var i = 0; i < this.interactions.length; i++) {
        this.interactions[i].canvas = this;
      }
    }

    getCursorPosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return new Vector({"x": x, "y": y});
    }

    getCursorPositionRelativeToCenter(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - (rect.left + (rect.width / 2));
      const y = event.clientY - (rect.top + (rect.height / 2));
      return new Vector({"x": x, "y": y});
    }

    eventOnMouseMove(e) {
      for (var i = 0; i < this.interactions.length; i++) {
        if (this.interactions[i].mousemove != null) {
          this.interactions[i].mousemove(e);
        }
      }
    }

    eventOnMouseDown(e) {
      this._lastMouseDownEvent = e;
      for (var i = 0; i < this.interactions.length; i++) {
        if (this.interactions[i].mousedown != null) {
          this.interactions[i].mousedown(e);
        }
      }
    }

    eventOnMouseUp(e) {
      for (var i = 0; i < this.interactions.length; i++) {
        if (this.interactions[i].mouseup != null) {
          this.interactions[i].mouseup(e);
        }
      }

      // Only trigger a click event if the mouse has not moved
      // since the last `mousedown` event.
      if ((this._lastMouseDownEvent.clientX == e.clientX) &&
          (this._lastMouseDownEvent.clientY == e.clientY)
      ) {
        for (var i = 0; i < this.interactions.length; i++) {
          if (this.interactions[i].click != null) {
            this.interactions[i].click(e);
          }
        }
      }
    }
  }

  class Render {
    constructor(parameters) {
      // HTML canvas element reference.
      this.canvas = parameters.canvas;

      // Randomness feed.
      this.feed = parameters.feed;

      // Geometric parameters.
      this.projection = parameters.projection;

      // Visual rendering parameters.
      this.background = (parameters.background) == null ? "#FFFFFF" : parameters.background;

      this.light =
        (parameters.light == null) ?
            {"top": 100, "left": 80, "right": 50} :
          parameters.light;

      this.effects = (parameters.effects == null) ? [] : parameters.effects;
      for (var i = 0; i < this.effects.length; i++) {
        this.effects[i].projection = this.projection;
      }

      // Rendering pipeline parameters.
      this.cache = (parameters.cache == null) ? false : parameters.cache;
      this.precedence = (parameters.precedence == null) ? false : parameters.precedence;

      // Cache for pre-processed expressions in the rendering pipeline.
      this.cache_ = new Cache({"time": 10000});

      // State.
      this.rendering = false;

      // Last collection of rendered instances.
      this.rendered = null;
    }

    initialize(center) {
      if (this.projection.dimensions == null) {
        // Match canvas pixel to in-browser rendered pixel.
        var dimensions = {
          "width": this.canvas.clientWidth, "height": this.canvas.clientHeight
        };
        this.projection.setDimensions(dimensions);
      }

      if (center != null && center != undefined) {
        this.projection.setCenter(center);
      }

      // Set number of pixels to match current dimensions and the center.
      this.canvas.width = this.projection.dimensions.width;
      this.canvas.height = this.projection.dimensions.height;

      // Set the background color.
      this.context = this.canvas.getContext('2d');
      this.context.fillStyle = new Color(this.background).rgb();
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resetCache() {
      this.cache_ = new Cache({"time": 10000});
    }

    setProjection(projection) {
      this.projection = projection;
      for (var i = 0; i < this.effects.length; i++) {
        this.effects[i].projection = this.projection;
      }
      this.canvas.projection = projection;
    }

    project(v) {
      const g = this.projection;
      var x = v.coordinates.x;
      var y = v.coordinates.y;
      var z = v.coordinates.z;

      if (v.scales != null && v.offsets != null) {
        if (v.scales.x != null && v.offsets.x != null) {
          x = x + (((1 - v.scales.x) / 2) * v.offsets.x);
        }
        if (v.scales.y != null && v.offsets.y != null) {
          y = y + (((1 - v.scales.y) / 2) * v.offsets.y);
        }
      }

      return {
        "coordinates": {
          "x": g.getCenter().x + (x * g.uX) - (y * g.uX),
          "y": g.getCenter().y + (y * g.uY) + (x * g.uY) - (z * g.uZ)
        },
        "dimensions": {
          "height": g.uZ * v.dimensions.height
        },
        "feed": v.feed
      };
    }

    edge(look, coordinates) {
      const edge = look.edge;
      const c_ = new Color(edge.color);
      const c = this.effectsOnColor(c_, coordinates, true);
      this.context.strokeStyle = c.rgb();
      this.context.setLineDash(edge.lineDash);
      this.context.lineWidth = edge.lineWidth;
      this.context.stroke();
      this.context.setLineDash([]);

      // Render luminosity effect if it is specified.
      if (look.edge.luminosity != null) {
        const blur = 0.2 * Math.floor(this.projection.unit * look.edge.luminosity);
        this.context.filter = "blur(" + blur + "px)";
        this.context.strokeStyle = c.rgb();
        this.context.setLineDash(edge.lineDash);
        this.context.lineWidth = 3 * edge.lineWidth;
        this.context.stroke();
        this.context.filter = "none";
      }
    }

    spot(light, look, coordinates, v, g, v0, v1, v2) {
      const c_ = this.effectsOnColor(new Color(look.spot.color), coordinates, true);
      const c = new Color(c_).lighterOrDarker(light, look.lit);
      const size = (look.spot.size * g.unit) / 750;
      const ratio = (look.spot.ratio == null) ? 1 : look.spot.ratio;
      this.context.fillStyle = new Color(c).rgba();

      // Set luminosity if it is specified.
      if (look.spot.luminosity != null) {
        this.context.shadowColor = c.rgb();
        this.context.shadowBlur = look.spot.luminosity;
      }

      if (look.spot.arrangement == 'regular') {
        const rows = Math.round(Math.sqrt(look.spot.quantity / ratio));
        const cols = Math.round(ratio * rows);
        const dr = 1 / rows;
        const dc = 1 / cols;
        for (var row = 1; row < rows - 1; row++) {
          for (var col = 1; col < cols - 1; col++) {
            if ((look.spot.probability == null) ||
                (v.feed.randReal([col + 3 * row]) < look.spot.probability)
            ) {
              this.context.beginPath();
              this.context.rect(
                v0.x + ((v1.x - v0.x) * (dr * row)) + ((v2.x - v0.x) * (dc * col)),
                v0.y + ((v1.y - v0.y) * (dr * row)) + ((v2.y - v0.y) * (dc * col)),
                g.unit * size,
                g.unit * size
              );
              this.context.fill();
            }
          }
        }
      } else {
        var quantity_ =
          (look.spot.probability == null) ?
            look.spot.quantity :
            Math.round(look.spot.quantity * look.spot.probability);
        for (var i = 0; i < quantity_; i++) {
          const rr =
            (4 * size) + (1 - (8 * size)) * v.feed.randReal([v.coordinates.x + 2 * i]);
          const cr =
            (4 * size) + (1 - (8 * size)) * v.feed.randReal([v.coordinates.y + 3 * i]);
          this.context.beginPath();
          this.context.rect(
            v0.x + ((v1.x - v0.x) * rr) + ((v2.x - v0.x) * cr),
            v0.y + ((v1.y - v0.y) * rr) + ((v2.y - v0.y) * cr),
            g.unit * size,
            g.unit * size
          );
          this.context.fill();
        }
      }

      // Reset luminosity effects.
      this.context.shadowColor = null;
      this.context.shadowBlur = 0;
    }

    line(light, look, coordinates, v, g, vA, vB, vC) {
      const c_ = this.effectsOnColor(new Color(look.line.color), coordinates, true);
      const c = new Color(c_).lighterOrDarker(light, look.lit);
      this.context.lineWidth = look.line.lineWidth;
      this.context.strokeStyle = new Color(c).rgba();
      const horizontal = look.line.orientation == "horizontal";
      const rows = look.line.quantity;
      const dr = 1 / (rows + 1);
      const v0 = new Vector(vA);
      const v1 = new Vector(horizontal ? vC : vB);
      const v2 = new Vector(horizontal ? vB : vC);
      const mag1 = v0.sub(horizontal ? v2 : v1).magnitude();
      const mag2 = v0.sub(horizontal ? v1 : v2).magnitude();
      const margin =
        (look.line.margin == null) ?
            (1 / rows) * (mag1 / mag2) :
          look.line.margin;
      for (var row = 1; row < rows + 1; row++) {
        if ((look.line.probability == null) ||
            (v.feed.randReal([3 * row]) < look.line.probability)
        ) {
          this.context.beginPath();
          this.context.moveTo(
            v0.x + ((v1.x - v0.x) * (dr * row)) + ((v2.x - v0.x) * margin),
            v0.y + ((v1.y - v0.y) * (dr * row)) + ((v2.y - v0.y) * margin)
          );
          this.context.lineTo(
            v0.x + ((v1.x - v0.x) * (dr * row)) + ((v2.x - v0.x) * (1 - margin)),
            v0.y + ((v1.y - v0.y) * (dr * row)) + ((v2.y - v0.y) * (1 - margin))
          );
          this.context.stroke();

          // Render luminosity effect if it is specified.
          if (look.line.luminosity != null) {
            const blur = 0.1 * Math.floor(this.projection.unit * look.line.luminosity);
            this.context.filter = "blur(" + blur + "px)";
            this.context.beginPath();
            this.context.moveTo(
              v0.x + ((v1.x - v0.x) * (dr * row)) + ((v2.x - v0.x) * margin),
              v0.y + ((v1.y - v0.y) * (dr * row)) + ((v2.y - v0.y) * margin)
            );
            this.context.lineTo(
              v0.x + ((v1.x - v0.x) * (dr * row)) + ((v2.x - v0.x) * (1 - margin)),
              v0.y + ((v1.y - v0.y) * (dr * row)) + ((v2.y - v0.y) * (1 - margin))
            );
            this.context.stroke();
            this.context.filter = "none";
          }
        }
      }
    }

    prismEnd(look, gs, v, p, scale, offset, color, bottom) {
      const g = this.projection;
      var s = (scale == null) ? {"x":1, "y":1} : scale;
      var o = (offset == null) ? {"x":0, "y":0} : offset;
      s = {"x": s.x * v.scales.x, "y": s.y * v.scales.y};
      o = {"x": o.x * v.scales.x, "y": o.y * v.scales.y};
      const yd = (p.dimensions.height * ((1 - v.scales.z)/2));
      const h = (bottom === true) ? 0 : p.dimensions.height * v.scales.z;
      const x = (g.uX * ((1 - v.scales.x)/2)) - (g.uX * ((1 - v.scales.y)/2)) +
        p.coordinates.x - gs.uX + ((Math.SQRT2/2)*o.x) - (o.y/Math.SQRT2);
      const y = -((1 + v.offsets.z) * yd) + (g.uY * ((1 - v.scales.x)/2)) +
        (g.uY * ((1 - v.scales.y)/2)) + p.coordinates.y +
        (o.x*g.tiltNorm) + (o.y*g.tiltNorm) - h;
      const shape = {
        "lft": {"x": x + ((1 - s.y) * gs.uX), "y": y - gs.uY + (gs.uY*s.y)},
        "bot": {
          "x": x + (s.x * gs.uX) + ((1 - s.y) * gs.uX),
          "y": y + (gs.uY * s.x) - (gs.uY * (1 - s.y))
        },
        "rgt": {"x": x + gs.uX + (s.x * gs.uX), "y": y - ((1 - s.x) * gs.uY)},
        "top": {"x": x + gs.uX, "y": y - gs.uY}
      };
      if ((shape.top.y < this.projection.dimensions.height || shape.bot.y > 0) &&
          (shape.lft.x < this.projection.dimensions.width || shape.rgt.x > 0)
      ) {
        var c_ = (color == null) ? look.face.color : color;
        c_ = new Color(c_).lighterOrDarker(this.light.top, look.lit);
        c_ = this.effectsOnColor(c_, p.coordinates);
        this.context.fillStyle = c_.rgba();
        this.context.strokeStyle = "rgba(0,0,0,0)";

        // Set luminosity if it is specified.
        if (look.face.luminosity != null) {
          this.context.shadowColor = c_.rgb();
          this.context.shadowBlur = look.face.luminosity * this.projection.unit;
        }

        this.context.beginPath();
        this.context.moveTo(shape.lft.x, shape.lft.y);
        this.context.lineTo(shape.top.x, shape.top.y);
        this.context.lineTo(shape.rgt.x, shape.rgt.y);
        this.context.lineTo(shape.bot.x, shape.bot.y);
        this.context.lineTo(shape.lft.x, shape.lft.y);
        this.context.fill();

        // Reset luminosity effects.
        this.context.shadowColor = null;
        this.context.shadowBlur = 0;

        if ("edge" in look) {
          this.edge(look, p.coordinates);
        }

        if ("spot" in look) {
          this.spot(
            this.light.top, look, p.coordinates, v, g,
            shape.top, shape.rgt, shape.lft
          );
        }

        if ("line" in look) {
          this.line(
            this.light.top, look, p.coordinates, v, g,
            shape.top, shape.rgt, shape.lft
          );
        }
      }
    }

    prismTop(look, gs, v, p, scale, offset, color) {
      this.prismEnd(look, gs, v, p, scale, offset, color, false);
    }

    prismLeft(look, gs, v, p, scale, offset, color) {
      const g = this.projection;
      const s = (scale == null) ? {"x":1, "y":1} : scale;
      const o = (offset == null) ? {"x":0, "y":0} : offset;
      const s_ = {"x": s.x * v.scales.x, "y": s.y * v.scales.y};
      const o_ = {"x": o.x * v.scales.x, "y": o.y * v.scales.y};
      const yd = (p.dimensions.height * ((1 - v.scales.z)/2));
      const h = p.dimensions.height * v.scales.z;
      const x = (g.uX * ((1 - v.scales.x)/2)) - (g.uX * ((1 - v.scales.y)/2)) +
        p.coordinates.x - gs.uX +
        (o.x / Math.SQRT2) + gs.uX*(1 - v.scales.y);
      const y = -((1 + v.offsets.z) * yd) + (g.uY * ((1 - v.scales.x)/2)) +
        (g.uY * ((1 - v.scales.y)/2)) + p.coordinates.y +
        o.y + (o.x * g.tiltNorm) - h - gs.uY*(1 - v.scales.y);
      const shape = {
        "toplft": {"x": x, "y": y},
        "botlft": {"x": x, "y": y + s.y * h},
        "botrgt": {"x": x + (s_.x * gs.uX), "y": y + s.y * h + ((s_.x * gs.uY))},
        "toprgt": {
          "x": x + (s_.x * gs.uX),
          "y": y + s.y * h + ((s_.x * gs.uY) + (s.y * (-h)))
        }
      };
      if ((shape.toplft.y < this.projection.dimensions.height || shape.botrgt.y > 0) &&
          (shape.toplft.x < this.projection.dimensions.width || shape.botrgt.x > 0)
      ) {
        var c_ = (color == null) ? look.face.color: color;
        c_ = new Color(c_).lighterOrDarker(this.light.left, look.lit);
        c_ = this.effectsOnColor(c_, p.coordinates);
        this.context.fillStyle = c_.rgb();
        this.context.strokeStyle = "rgba(0,0,0,0)";

        // Set luminosity if it is specified.
        if (look.face.luminosity != null) {
          this.context.shadowColor = c_.rgb();
          this.context.shadowBlur = look.face.luminosity * this.projection.unit;
        }

        this.context.beginPath();
        this.context.moveTo(shape.toplft.x, shape.toplft.y);
        this.context.lineTo(shape.botlft.x, shape.botlft.y);
        this.context.lineTo(shape.botrgt.x, shape.botrgt.y);
        this.context.lineTo(shape.toprgt.x, shape.toprgt.y);
        this.context.lineTo(shape.toplft.x, shape.toplft.y);
        this.context.fill();

        // Reset luminosity effects.
        this.context.shadowColor = null;
        this.context.shadowBlur = 0;

        if ("edge" in look) {
          this.edge(look, p.coordinates);
        }

        if ("spot" in look) {
          this.spot(
            this.light.left, look, p.coordinates, v, g,
            shape.toplft, shape.toprgt, shape.botlft
          );
        }

        if ("line" in look) {
          this.line(
            this.light.left, look, p.coordinates, v, g,
            shape.toplft, shape.toprgt, shape.botlft
          );
        }
      }
    }

    prismRight(look, gs, v, p, scale, offset, color) {
      const g = this.projection;
      const s = (scale == null) ? {"x":1, "y":1} : scale;
      const o = (offset == null) ? {"x":0, "y":0} : offset;
      const s_ = {"x": s.x * v.scales.x, "y": s.y * v.scales.y};
      const o_ = {"x": o.x * v.scales.x, "y": o.y * v.scales.y};
      const yd = (p.dimensions.height * ((1 - v.scales.z)/2));
      const h = p.dimensions.height * v.scales.z;
      const x = (g.uX * ((1 - v.scales.x) / 2)) - (g.uX * ((1 - v.scales.y) / 2)) +
        p.coordinates.x - gs.uX + (o_.x / Math.SQRT2) -
        gs.uX * (1 - v.scales.x);
      const y =
        -((1 + v.offsets.z) * yd) + (g.uY * ((1 - v.scales.x) / 2)) +
        (g.uY * ((1 - v.scales.y) / 2)) + p.coordinates.y + o_.y - (o_.x * g.tiltNorm) -
        h - gs.uY*(1 - v.scales.x);
      const omvsy = (1 - v.scales.y);
      const xo = gs.uX * omvsy;
      const yo = -gs.uY * (1 - v.scales.y);
      const columns =
        (look.pattern == null || look.pattern.columns == null) ?
          1 :
          look.pattern.columns;
      const sx = s.x * (1 + ((columns - 1) * (1 - v.scales.y)));

      const shape = {
        "toplft": {"x": x + gs.uX + xo, "y": y + yo + gs.uY},
        "toprgt": {
          "x": x + gs.uX + (sx * gs.uX),
          "y": y + yo + gs.uY + ((omvsy - sx) * gs.uY)
        },
        "botrgt": {
          "x": x + gs.uX + (sx * gs.uX),
          "y": y + yo + gs.uY + ((omvsy - sx) * gs.uY) + (s.y * h)
        },
        "botlft": {"x": x + gs.uX + xo, "y": y + yo + (s.y * h) + gs.uY}
      };
      if ((shape.toprgt.y < this.projection.dimensions.height || shape.botlft.y > 0) &&
          (shape.botlft.x < this.projection.dimensions.width || shape.botrgt.x > 0)
      ) {
        var c_ = (color == null) ? look.face.color : color;
        c_ = new Color(c_).lighterOrDarker(this.light.right, look.lit);
        c_ = this.effectsOnColor(c_, p.coordinates);
        this.context.fillStyle = c_.rgb();
        this.context.strokeStyle = "rgba(0,0,0,0)";

        // Set luminosity if it is specified.
        if (look.face.luminosity != null) {
          this.context.shadowColor = c_.rgb();
          this.context.shadowBlur = look.face.luminosity * this.projection.unit;
        }

        this.context.beginPath();
        this.context.moveTo(shape.toplft.x, shape.toplft.y);
        this.context.lineTo(shape.toprgt.x, shape.toprgt.y);
        this.context.lineTo(shape.botrgt.x, shape.botrgt.y);
        this.context.lineTo(shape.botlft.x, shape.botlft.y);
        this.context.lineTo(shape.toplft.x, shape.toplft.y);
        this.context.fill();

        // Reset luminosity effects.
        this.context.shadowColor = null;
        this.context.shadowBlur = 0;

        if ("edge" in look) {
          this.edge(look, p.coordinates);
        }

        if ("spot" in look) {
          this.spot(
            this.light.right, look, p.coordinates, v, g,
            shape.toplft, shape.toprgt, shape.botlft
          );
        }

        if ("line" in look) {
          this.line(
            this.light.right, look, p.coordinates, v, g,
            shape.toplft, shape.toprgt, shape.botlft
          );
        }
      }
    }

    prism(v) {
      const g = this.projection;
      const p = this.project(v);
      var hs = [v.dimensions.height, v.dimensions.height, 1];
      var sides = ["prismLeft", "prismRight", "prismTop"];
      var looks = v.looks(true);
      for (var side = 0; side < sides.length; side++) {
        var look = looks[side];
        if (look.pattern == null) {
          this[sides[side]](
            look, g, v, p,
            {"x": 1, "y": 1},
            {"x": 0, "y": 0},
            look.emitFaceColor(v.feed, [v.coordinates.x, v.coordinates.y])
          );
        } else {
          const rows = (look.pattern.rows == null) ? 1 : look.pattern.rows;
          const cols = (look.pattern.columns == null) ? 1 : look.pattern.columns;
          for (var r = 0; r < cols; r++) {
            const hs_side = (hs[side] < 1) ? 1 : hs[side];
            for (var c_ = 0; c_ < rows * hs_side; c_++) {
              const hsSideRatio = (hs_side / Math.ceil(hs_side));
              const c = c_ * hsSideRatio;
              var uY = (sides[side] == "prismTop") ? ((g.uX) * Math.SQRT2) : g.uZ;
              var sX = (sides[side] == "prismLeft") ?
                v.scales.x :
                  ((sides[side] == "prismRight") ? (v.scales.y / v.scales.x) : 1);
              var nY = (sides[side] == "prismRight") ? (1 / v.scales.y) : 1;
              this[sides[side]](
                look, g, v, p,
                {"x": 1 / cols, "y": hsSideRatio / (rows * hs_side)},
                {
                  "x": ((r * (sX * g.uX * Math.SQRT2)) / cols),
                  "y": ((nY * c * uY) / rows)
                },
                look.emitFacePatternColor(
                  r, c,
                  v.feed, [v.coordinates.x, v.coordinates.y]
                )
              );
            }
          }
        }
      }
      return p;
    }

    segment(coordinates, length, s, i, v, ry) {
      ry = (ry == null) ? 0 : ry;
      const g = this.projection;
      const x_ = coordinates.x, y_ = coordinates.y;
      const look = v.look;
      const c_ =
        look.emitFaceColor(
          v.feed,
          [i, v.coordinates.x, v.coordinates.y]
        );
      this.context.fillStyle = new Color(c_).rgba();
      this.context.strokeStyle = "rgba(0,0,0,0)";

      // Set luminosity if it is specified.
      if (look.face.luminosity != null) {
        this.context.shadowColor = c_.rgb();
        this.context.shadowBlur = look.face.luminosity * this.projection.unit;
      }

      this.context.beginPath();
      this.context.rect(x_ - (length / 2), y_ - g.uY, length / 2, ry);

      // Reset luminosity effects.
      this.context.shadowColor = null;
      this.context.shadowBlur = 0;

      if ("edge" in v.look) {
        this.edge(v.look, coordinates);
      }
    }

    point(coordinates, length, s, i, v) {
      const g = this.projection;
      this.segment(coordinates, g.uX / 10, s, i, v, g.uY / 10);
    }

    bubble(coordinates, r, s, i, v) {
      const x_ = coordinates.x, y_ = coordinates.y;
      const look = v.look;
      const c_ =
        look.emitFaceColor(
          v.feed,
          [i, v.coordinates.x, v.coordinates.y]
        );
      const c0_ =
        new Color(c_).lighterOrDarker(
          (this.light.left + this.light.top) / 2,
          look.lit
        );
      const c1_ =
        new Color(c_).lighterOrDarker(
          (this.light.left + this.light.right) / 2,
          look.lit
        );
      const c0 = this.effectsOnColor(c0_, {"x": x_, "y": y_});
      const c1 = this.effectsOnColor(c1_, {"x": x_, "y": y_});
      var grd = this.context.createRadialGradient(
        x_ - (s / 5), y_ - (s / 5), s / 6, x_, y_, s
      );
      grd.addColorStop(0, new Color(c0).rgba());
      grd.addColorStop(1, new Color(c1).rgba());
      this.context.fillStyle = grd;
      this.context.strokeStyle = "rgba(0,0,0,0)";

      // Set luminosity if it is specified.
      if (look.face.luminosity != null) {
        this.context.shadowColor = c0.rgb();
        this.context.shadowBlur = look.face.luminosity * this.projection.unit;
      }

      const angles = (v.look.angles == null) ? [0, 2 * Math.PI] : v.look.angles;
      this.context.beginPath();
      this.context.arc(x_, y_, 0.7 * r, angles[0], angles[1], false);
      this.context.fill();

      // Reset luminosity effects.
      this.context.shadowColor = null;
      this.context.shadowBlur = 0;

      if ("edge" in v.look) {
        this.edge(v.look, coordinates);
      }
    }

    cloud(v) {
      const g = this.projection;
      const p = this.project(v);
      const sx = (v.scales != null && v.scales.x != null) ? v.scales.x : 1;
      const sy = (v.scales != null && v.scales.y != null) ? v.scales.y : 1;
      const ox = (v.offsets != null && v.offsets.x != null) ? v.offsets.x : 1;
      const oy = (v.offsets != null && v.offsets.y != null) ? v.offsets.y : 1;
      const h = v.dimensions.height == null ? 1 : v.dimensions.height;
      const x = p.coordinates.x + (ox * ((1 - sx) / 2));
      const y = p.coordinates.y + (oy * ((1 - sy) / 2)) - (g.uZ * h) + (g.uY / 2);
      const r =
        (v.dimensions.radius * g.uX) /
        ((2 * Math.sqrt(v.dimensions.quantity)) / 3);
      const spread = (v.dimensions.spread != null) ? v.dimensions.spread : 1;
      const spread_x = sx * spread, spread_y = sy * spread;
      for (var i = 0; i < v.dimensions.quantity; i++) {
        var df =
          (v.dimensions.positional === true) ?
              (
                Math.abs((v.coordinates.x * 3) +
                (v.coordinates.y * 7) + (v.coordinates.x * v.coordinates.y))
              ) :
            0;
        var dx =
          (1.7) * (
            (-0.5 * g.uX) + (v.feed.randReal([(2 * i) + df]) * g.uX)
          );
        var dyf = v.feed.randReal([((3 * i) + 1) + df]);
        var dzf = v.feed.randReal([((2 * i) + 1) + df]);
        var dy = dzf * g.uZ * h + ((-g.uY / 2) + (g.uY * dyf));
        var dr = 0.75 + 0.5 * (v.feed.randReal([(2 * i + 2) + df]));
        this[v.form.particle](
          {
            "x": x + (spread_x * dx),
            "y": y + (spread_y * dy)
          },
          r, r * dr, i, v
        );
      }
    }

    instances(e, es, attrs) {
      es = (es == null) ? [] : es;
      attrs = (attrs == null) ? {} : attrs;
      if (e.$ != null && e.$.type === 'atom') {
        e.$.coordinates = ("coordinates" in e.$) ? e.$.coordinates : {};
        if ("coordinates" in attrs) {
          if (!("x" in e.$.coordinates)) {
            e.$.coordinates.x = attrs.coordinates.x;
          }
          if (!("y" in e.$.coordinates)) {
            e.$.coordinates.y = attrs.coordinates.y;
          }
        }
        es.push(new Instance(e.$));
      } else if (e.$ != null && e.$.type !== 'atom') {
        if ("coordinates" in e.$) {
          attrs.coordinates = ("coordinates" in attrs) ? attrs.coordinates : {};
          if ("x" in e.$.coordinates) {
            attrs.coordinates.x = e.$.coordinates.x;
          }
          if ("y" in e.$.coordinates) {
            attrs.coordinates.y = e.$.coordinates.y;
          }
        }

        for (var a in e) {
          if (a != '$') {
            this.instances(e[a], es, attrs);
          }
        }
      } else if (Array.isArray(e)) {
        for (var a in e) {
          this.instances(e[a], es);
        }
      }
      return es;
    }

    effectsOnColor(color, coordinates, edge) {
      edge = (edge == null) ? false : edge;
      for (var i = 0; i < this.effects.length; i++) {
        color = this.effects[i].color(coordinates, color, edge);
      }
      return color;
    }

    prepare(center, ss, fi, cache) {
      // Initialize the canvas.
      this.initialize(center);

      this.context.fillStyle = new Color(this.background).rgb();
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      var vs = []; // Rendered instances.
      if (ss != null) {
        if (cache && this.cache_.scapes.length != ss.render().length) {
          this.cache_.initialize(ss.render().length);
        }

        const self = this;
        for (var i = 0; i < ss.render().length; i++) {
          const scape = ss.render()[i];
          this.projection.gridPlaneCellVisibleMap(function(coordinates) {
            // Determine whether any active effects indicate that the
            // current coordinates should not be rendered.
            var render = true;
            if (self.effects != null) {
              for (var j = 0; j < self.effects.length; j++) {
                render = render && self.effects[j].render(coordinates);
              }
            }

            if (render) {
              var es = null, fr = null;

              // Apply coordinate transformation, if one was supplied.
              const coordinates_ = ss.coordinates(coordinates);

              // Determine whether the use the rendering cache.
              if (!cache) {
                // Either re-prepare the feed or use the feed cache when possible.
                fr = self.feed.feedRegionAt(coordinates_);

                // Evaluate the concept expressions into concrete instances.
                es = self.instances(ss[scape](coordinates, fr));
              } else {
                // Determine the cache key for these grid coordinates
                // and check if a cache entry exists.
                const cacheKey = coordinates.toCSV();
                const entry = self.cache_.lookup(i, cacheKey);
                if (entry != null) {
                  es = entry.es;
                } else {
                  // Either re-prepare the feed or use the feed cache when possible.
                  fr = self.feed.feedRegionAt(coordinates_);

                  // Evaluate the concept expressions into concrete instances
                  // and update the cache.
                  es = self.instances(ss[scape](coordinates, fr));
                  self.cache_.update(i, cacheKey, es);
                }
              }

              // Add the evaluated instances to the pipeline.
              for (var j = 0; j < es.length; j++) {
                if (es[j].render != false) {
                  vs.push(es[j]);
                }
              }
            }
          });
        }
      }

      // Remove older data from the cache.
      this.cache_.refresh();

      // Sort values so that they are rendered with correct occlusions.
      // Precedence of the `x` and `y` dimensions does not matter, so choose
      // it at random.
      if (Math.random() > 0.5) {
        vs.sort(function (a, b) {
          var a = a.coordinates, b = b.coordinates;
          const do_ = a.o - b.o, dz = a.z - b.z, dy = a.y - b.y, dx = a.x - b.x;
          return (dx == 0) ? ((dy == 0) ? ((dz == 0) ? do_ : dz) : dx) : dy;
        });
      } else {
        vs.sort(function (a, b) {
          var a = a.coordinates, b = b.coordinates;
          const do_ = a.o - b.o, dz = a.z - b.z, dy = a.y - b.y, dx = a.x - b.x;
          return (dx == 0) ? ((dy == 0) ? ((dz == 0) ? do_ : dz) : dy) : dx;
        });
      }

      return vs;
    }

    render(center, ss, fi, precedence, cache) {
      // Set default values for optional parameters.
      cache = (cache == null) ? this.cache : cache;
      precedence = (precedence == null) ? this.precedence : precedence;

      // Prepare and assemble the collection of evaluated instances based on
      // the supplied rendering parameters.
      const vs = this.prepare(center, ss, fi, cache), vps = [];
      if (!precedence) {
        for (var i = 0; i < vs.length; i++) {
          const v = vs[i];
          const p = this[v.form.shape](v);
          vps.push({"v":v, "p":p});
        }
      } else {
        var precedence_ = {};
        for (var i = 0; i < vs.length; i++) {
          const v = vs[i];
          const cs = v.coordinates.toCSV();
          if (!(cs in precedence_)) {
            const p = this[v.form.shape](v);
            vps.push({"v":v, "p":p});
          }
          precedence_[cs] = true;
        }
      }

      this.rendered = vps; // Retain last rendered collection of instances.
      return vps;
    }

    renderGradually(center, ss, fi, callback, tick, batch, vs, index) {
      this.rendering = true;
      tick = (tick == null) ? 1 : tick;
      batch = (batch == null) ? 16 : batch;
      if (vs == null && index == null) {
        vs = this.prepare(center, ss, fi);
        index = 0;
      }
      const self = this;
      setTimeout(function () {
        for (var i = 0; i < batch; i++) {
          if (index >= vs.length) {
            break;
          }
          const v = vs[index];
          const p = self[v.form.shape](v);
          index += 1;
        }
        if (index < vs.length) {
          self.renderGradually(center, ss, fi, callback, tick, batch, vs, index);
        } else {
          self.rendering = false;
          if (callback != null) {
            callback();
          }
        }
      }, tick);
    }
  }

  var retroscapes = {
    // Exported classes.
    "FeedCell": FeedCell,
    "FeedRegion": FeedRegion,
    "Feed": Feed,
    "Anchors": Anchors,
    "Vector": Vector,
    "Color": Color,
    "Look": Look,
    "Looks": Looks,
    "Concept": Concept,
    "Concepts": Concepts,
    "Instance": Instance,
    "Scape": Scape,
    "Geometry": Geometry,
    "Effect": Effect,
    "EffectPlateSquare": EffectPlateSquare,
    "Interaction": Interaction,
    "InteractionDrag": InteractionDrag,
    "InteractionNudge": InteractionNudge,
    "Cache": Cache,
    "Canvas": Canvas,
    "Render": Render,

    // Library metadata.
    "version": "0.1.0"
  };

  global.retroscapes = retroscapes;
})(this);
