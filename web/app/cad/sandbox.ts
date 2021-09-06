import BrepBuilder from 'brep/brep-builder'
import * as BREPPrimitives from 'brep/brep-primitives'
import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from "geom/curves/nurbsCurve";
import {surfaceIntersect} from 'geom/intersection/surfaceSurface';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {createOctreeFromSurface, traverseOctree} from "voxels/octree";
import {Matrix3x4} from 'math/matrix';
import {AXIS, ORIGIN} from "math/vector";
import {BrepInputData, CubeExample} from "engine/data/brepInputData";
import {ApplicationContext} from "context";
import {readShellEntityFromJson} from "./scene/wrappers/entityIO";
import {DEFLECTION, E0_TOLERANCE} from "./craft/e0/common";
import {normalizetessellationData, readBrep, writeBrep} from "brep/io/brepIO";
import {PRIMITIVE_TYPES} from "engine/data/primitiveData";
import {pullFace} from "brep/operations/directMod/pullFace";
import {DefeatureFaceWizard} from "./craft/defeature/DefeatureFaceWizard";
import {defeatureByVertex, defeatureByEdge} from "brep/operations/directMod/defeaturing";
import {BooleanType} from "engine/api";
import { testEdgeSplit } from 'brep/operations/directMod/edgeSplit';
import {initOpenCascade} from "opencascade.js";
import VertexFactory from 'brep/vertexFactory';
import { BrepSurface } from 'geom/surfaces/brepSurface';
import NullSurface from 'geom/surfaces/nullSurface';
import { BrepOutputData } from 'engine/data/brepOutputData';
import { MBrepShell } from './model/mshell';
import { occ2brep } from './occ/occ2models';

export function runSandbox(ctx: ApplicationContext) {

  const {services, services: { viewer, cadScene, cadRegistry, exposure, exposure: {addShellOnScene} }} = ctx;

  function test1() {

    const bb = new BrepBuilder();

    const a1 = bb.vertex(0, 0, 0);
    const b1 = bb.vertex(300, 0, 0);
    const c1 = bb.vertex(300, 300, 0);
    const d1 = bb.vertex(0, 300, 0);

    const a2 = bb.vertex(0, 0, 300);
    const b2 = bb.vertex(300, 0, 300);
    const c2 = bb.vertex(300, 300, 300);
    const d2 = bb.vertex(0, 300, 300);

    bb.face().loop([d1, c1, b1, a1]);
    bb.face().loop([a2, b2, c2, d2]);
    bb.face().loop([a1, b1, b2, a2]);
    bb.face().loop([b1, c1, c2, b2]);
    bb.face().loop([c1, d1, d2, c2]);
    bb.face().loop([d1, a1, a2, d2]);

    let result = bb.build();
    addShellOnScene(result);
  }

  function cylTest() {

    const cylinder1 = BREPPrimitives.cylinder(200, 500);


    // const cylinder2 = (function () {
    //     let circle1 = new Circle(-1, new Vector(0,0,0), 200).toNurbs( new Plane(AXIS.X, 500));
    //     let circle2 = circle1.translate(new Vector(-1000,0,0));
    //     return enclose([circle1], [circle2])
    //   })();


    const cylinder2 = BREPPrimitives.cylinder(200, 500, Matrix3x4.rotateMatrix(90, AXIS.Y, ORIGIN));

    addShellOnScene(cylinder1);
    addShellOnScene(cylinder2);
    let result = exposure.brep.bool.subtract(cylinder1, cylinder2);

    addShellOnScene(result);
  }

  function test2() {

    function square() {
      let bb = new BrepBuilder();

      const a = bb.vertex(0, 0, 0);
      const b = bb.vertex(300, 0, 0);
      const c = bb.vertex(300, 300, 0);
      const cc = bb.vertex(150, 100, 0);
      const d = bb.vertex(0, 300, 0);
      bb.face().loop([a, b, c, cc, d]);
      return bb.build();
    }
    function square2() {
      let bb = new BrepBuilder();

      const a = bb.vertex(0, 150, -100);
      const b = bb.vertex(350, 150, -100);
      const c = bb.vertex(350, 150, 350);
      const d = bb.vertex(0, 150, 350);
      bb.face().loop([a, b, c, d]);
      return bb.build();
    }
    let s1 = square();
    let s2 = square2();
    // addShellOnScene(s1);
    // addShellOnScene(s2);

    // let result = exposure.brep.bool.intersect(s1, s2);
    let result = s1;
    addShellOnScene(result);
  }

  function test3() {
  
  
      	let direction = [0, 0, 500];
  
      	let sketch = [[
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [0, 0, 0],
            b: [500, 0, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [500, 0, 0],
            b: [500, 500, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [500, 500, 0],
            b: [0, 500, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [0, 500, 0],
            b: [0, 0, 0],
          },
      	]]
  
      	let data = ctx.craftEngine.modellingEngine.extrude({
      		vector: direction,
      		sketch: sketch,
      		tolerance: E0_TOLERANCE,
      		deflection: DEFLECTION
      	})
  
      	let box1 = readBrep(data);
  
//     const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

//     const box3 = exposure.brep.primitives.box(150, 600, 350, new Matrix3x4().translate(25, 25, -250));
    // let result = exposure.brep.bool.union(box1, box2);
    let result = exposure.brep.bool.subtract(box1, box2);
    result = exposure.brep.bool.subtract(result, box3);
    // addShellOnScene(box1);
    addShellOnScene(result);
  }

  function test4() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750);

    console.dir(writeBrep(box1));
    let l1 = ctx.craftEngine.modellingEngine.loadModel(writeBrep(box1));
    let l2 = ctx.craftEngine.modellingEngine.loadModel(writeBrep(box2));

    // let l11 = ctx.craftEngine.modellingEngine.getModelData({model: l1.ptr});


    console.dir(l1);
    console.dir(l2);
    // console.dir(l11);
    //
    // console.dir(writeBrep(box1));
    // console.dir(writeBrep(readShellEntityFromJson(l1).brepShell));

    const result = ctx.craftEngine.modellingEngine.boolean({
      deflection: DEFLECTION,
      operandsA: [l1.ptr],
      operandsB: [l2.ptr],
      tolerance: E0_TOLERANCE,
      type: BooleanType.SUBTRACT
    });

    ctx.streams.craft.models.next([
      // readShellEntityFromJson(l1),
      // readShellEntityFromJson(l2),
      readShellEntityFromJson(result.result)
    ]);
  }

  function testSplitFace() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);

    const serialized = writeBrep(box1);
    const loaded = ctx.craftEngine.modellingEngine.loadModel(serialized);
    const face = loaded.faces[0];
    const [e1, e2]  = face.loops[0];

    const splitted = ctx.craftEngine.modellingEngine.splitFace({
      deflection: DEFLECTION,
      shape: loaded.ptr,
      face: face.ptr,
      edge: {
        curve: {
          TYPE: 'LINE',
          a: [-250, -250, -250],
          b: [ 250, -250,  250]
        }
      }
    })

    services.exposure.addOnScene(readShellEntityFromJson(splitted));

//     addShellOnScene(result);
  }

  function testRemoveFaces() {

    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

    let withHole = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.bool.subtract(box1, box2)));
    services.exposure.addOnScene(readShellEntityFromJson(withHole));




    ctx.domService.contributeComponent(DefeatureFaceWizard);

  }

  function testRemoveVertex() {

    const boxData = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.primitives.box(500, 500, 500)));
    const box = readShellEntityFromJson(boxData);
    services.exposure.addOnScene(box);
    box.vertices.forEach(v => v.ext.view.rootGroup.sphere.onMouseClick = () => {
      ctx.craftService.models$.update((models) => {
        const [cube] = models;
        const result = defeatureByVertex(cube.brepShell, v.brepVertex, ctx.craftEngine.modellingEngine);
        const mShell = readShellEntityFromJson(result);
        return [mShell];
      });
    });
  }

  function testRemoveEdge() {

    const boxData = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.primitives.box(500, 500, 500)));
    const box = readShellEntityFromJson(boxData);
    services.exposure.addOnScene(box);
    box.edges.forEach(e => e.ext.view.picker.onMouseClick = () => {
      ctx.craftService.models$.update((models) => {
        const [cube] = models;
        const result = defeatureByEdge(cube.brepShell, e.brepEdge, ctx.craftEngine.modellingEngine);
        const mShell = readShellEntityFromJson(result);
        return [mShell];
      });
    });
  }

  function test5() {

    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srf = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srf = srf.transform(new Matrix3x4().scale(10,10,10).toArray());
    srf = new NurbsSurface(srf);
    // __DEBUG__.AddNurbs(srf);

    let bb = new BrepBuilder();
    function vx(u, v) {
      let pt = srf.point(u, v);
      return bb.vertex(pt.x, pt.y, pt.z);
    }

    const a = vx(0.13, 0.13);
    const b = vx(0.9, 0.13);
    const c = vx(0.9, 0.9);
    const d = vx(0.13, 0.9);

    const e = vx(0.33, 0.33);
    const f = vx(0.33, 0.73);
    const g = vx(0.73, 0.73);
    const h = vx(0.73, 0.33);

    function fromVerb(verb) {
      return new BrepCurve(new NurbsCurve(verb));
    }

    let shell = bb.face(srf)
      .loop()
      .edgeTrim(a, b, fromVerb(srf.verb.isocurve(0.13, true)))
      .edgeTrim(b, c, fromVerb(srf.verb.isocurve(0.9, false)))
      .edgeTrim(c, d, fromVerb(srf.verb.isocurve(0.9, true).reverse()))
      .edgeTrim(d, a, fromVerb(srf.verb.isocurve(0.13, false).reverse()))
      .loop()
      .edgeTrim(e, f, fromVerb(srf.verb.isocurve(0.33, false)))
      .edgeTrim(f, g, fromVerb(srf.verb.isocurve(0.73, true)))
      .edgeTrim(g, h, fromVerb(srf.verb.isocurve(0.73, false).reverse()))
      .edgeTrim(h, e, fromVerb(srf.verb.isocurve(0.33, true).reverse()))
      .build();

    addShellOnScene(shell);
  }

  function curvesIntersect() {
    let p1 = [-50,0,0], p2 = [100,0,0], p3 = [100,100,0], p4 = [0,100,0], p5 = [50, 50, 0];
    let pts = [p1, p2, p3, p4, p5];
    let curve1 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( pts, 3 )));

    let p1a = [-50,0,0], p2a = [50,-10,0], p3a = [150,50,0], p4a = [30,100,0], p5a = [50, 120, 0];
    let ptsa = [p1a, p2a, p3a, p4a, p5a];
    let curve2 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( ptsa, 3 )));

    curve1 = curve1.splitByParam(0.6)[0];
    __DEBUG__.AddCurve(curve1);
    __DEBUG__.AddCurve(curve2);

    let points = curve1.intersectCurve(curve2);
    for (let p of points) {
      __DEBUG__.AddPoint(p.p0);
    }

    // viewer.render();
  }

  
  function surfaceSurfaceIntersect() {
    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srfA = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srfA = srfA.transform(new Matrix3x4().scale(10,10,10).toArray());
    let srfB = srfA
      .transform(new Matrix3x4().translate(250,250,250).toArray())
      .transform(Matrix3x4.rotateMatrix(Math.PI/2, AXIS.X, ORIGIN).toArray());
    srfA = new NurbsSurface(srfA);
    srfB = new NurbsSurface(srfB);

    __DEBUG__.AddParametricSurface(srfA);
    __DEBUG__.AddParametricSurface(srfB);

    
    

  }
  
  function cylinderAndPlaneIntersect() {

    const cylinder = BREPPrimitives.cylinder(200, 500);

    const box = BREPPrimitives.box(700, 600, 100);
    
    addShellOnScene(cylinder);
    addShellOnScene(box);

    let surfaceA = cadRegistry.findFace('0:0').surface;
    let surfaceB = cadRegistry.findFace('1:4').surface;


    let curves = surfaceIntersect(surfaceA.data, surfaceB.data);
    // curve.approxPolyline.

    for (let ic of curves) {
      ic.debug();
      let curve = new BrepCurve(ic);
      let pt = [-50, 220, 0];
      __DEBUG__.AddPoint3(pt, 0x0000ff);
      // let u = findClosestToCurveParamRoughly(curve.impl.approx, pt);
      // let exactU = closestToCurveParam(curve.impl.approx, pt);
      //
      // let clPt = curve.impl.approx.point(u);
      // let exactPt = curve.impl.approx.point(exactU);
      // __DEBUG__.AddPoint3(clPt, 0xffff00);
      // __DEBUG__.AddPoint3(exactPt, 0xff0000);
      // console.dir(curve);
      // __DEBUG__.HideSolids();
    }
    
  }

  function voxelTest(size = 8) {

    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srf = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srf = srf.transform(new Matrix3x4().scale(10,10,10).toArray());
    srf = new NurbsSurface(srf);
    __DEBUG__.AddParametricSurface(srf);

    const origin = [0,-500,-250];
    const treeSize = size;
    const sceneSize = 512;
    const r = sceneSize / treeSize;
    const octree = createOctreeFromSurface(origin, sceneSize, treeSize, srf, 1);
    traverseOctree(octree, treeSize,  (x, y, z, size, tag) => {
      if (size === 1 && tag === 1) {

        // const base = [x, y, z];
        // vec._mul(base, r);
        // vec._add(base, origin);
        // __DEBUG__.AddPolyLine3([
        //   vec.add(base, [0, r, 0]),
        //   vec.add(base, [0, r, r]),
        //   vec.add(base, [0, 0, r]),
        //   base,
        //   vec.add(base, [r, r, 0]),
        //   vec.add(base, [r, r, r]),
        //   vec.add(base, [r, 0, r]),
        //   vec.add(base, [0, 0, 0]),
        // ], 0xff0000);
      }
    });
    console.log("done")
  }

  function testPullFace() {

    const box: BrepInputData = CubeExample();
    //
    let data = ctx.craftEngine.modellingEngine.loadModel(box);


    const shell = readShellEntityFromJson(data);
    services.exposure.addOnScene(shell);

    pullFace(shell.brepShell.faces[0], 700);

    const ser = writeBrep(shell.brepShell);
    ser.curves = {};
    console.log(ser);
    let fromSerialization = ctx.craftEngine.modellingEngine.loadModel(ser);

    const mBrepShell2 = readShellEntityFromJson(fromSerialization);
    services.exposure.addOnScene(mBrepShell2);

  }

  function nonUniformScale() {

    const box: BrepInputData = CubeExample();

    let data = ctx.craftEngine.modellingEngine.loadModel(box);
    // data = ctx.craftEngine.modellingEngine.transform({
    //   model: data.ptr,
    //   matrix: new Matrix3x4().scale(1,2,1).toFlatArray()
    // });

    const mShell = readShellEntityFromJson(data);
    // const shell = mShell.brepShell as Shell;
    // // shell.transform(new Matrix3x4().scale(1,2,1));

    // const scaledInput = writeBrep(shell);
    // console.dir(scaledInput);
    // let data2 = ctx.craftEngine.modellingEngine.loadModel(scaledInput);

    // const mShell2 = readShellEntityFromJson(data2);
    services.exposure.addOnScene(mShell);
  }

  function testLoadBrep() {

    const box: BrepInputData = CubeExample();
    //
    let data = ctx.craftEngine.modellingEngine.loadModel(box);
    //
    // ctx.craftEngine.modellingEngine.setLocation({
    //   model: data.ptr,
    //   matrix: Matrix3x4.rotateMatrix(45 * DEG_RAD, AXIS.Y, ORIGIN).toFlatArray()
    // });
    //
    // data = ctx.craftEngine.modellingEngine.getModelData({
    //   model: data.ptr,
    // });
    //
    // const tessellation = ctx.craftEngine.modellingEngine.tessellate({
    //   model: data.ptr,
    //   deflection: 3
    // });
    //
    // const location = ctx.craftEngine.modellingEngine.getLocation({
    //   model: data.ptr
    // });
    //
    // console.log("Location: ->>> ");
    // console.log(location);
    //
    // console.log("Tesselation: ->>> ");
    // console.log(tessellation);
    //
    // // ctx.craftEngine.modellingEngine.dispose({
    // //   model: data.ptr
    // // });
    // //
    // // ctx.craftEngine.modellingEngine.getLocation({
    // //   model: data.ptr
    // // });

    console.log("DATA:");
    console.log(data);


    const mBrepShell = readShellEntityFromJson(data);
    // services.exposure.addOnScene(mBrepShell);

    // return ;
// debugger
    const serialized = writeBrep(mBrepShell.brepShell);
    console.log("SERAIL:");
    console.log(serialized);
    let fromSerialization = ctx.craftEngine.modellingEngine.loadModel(serialized);

    console.log("FROM:");
    console.log(fromSerialization);

    const mBrepShell2 = readShellEntityFromJson(fromSerialization);

    services.exposure.addOnScene(mBrepShell2);

  }

  function testTess() {

    	let direction = [0, 0, 100];

    	let sketch = [[
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [0, 0, 0],
          b: [100, 0, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [100, 0, 0],
          b: [100, 100, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [100, 100, 0],
          b: [0, 100, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [0, 100, 0],
          b: [0, 0, 0],
        },
    	]]

    	let data = ctx.craftEngine.modellingEngine.extrude({
    		vector: direction,
    		sketch: sketch,
    		tolerance: E0_TOLERANCE,
    		deflection: DEFLECTION
    	})

    	let brep = readBrep(data);
    	let tess = ctx.craftEngine.modellingEngine.tessellate({
    		model: data.ptr,
    		deflection: DEFLECTION
    	})

      __DEBUG__.AddFacesTessellation(tess.faces)

      console.dir(tess.faces)

      // const mBrepShell = readShellEntityFromJson(data);

      // services.exposure.addOnScene(mBrepShell);


    }

  // cylinderAndPlaneIntersect();
  // curvesIntersect();
  // cylTest();
  // surfaceSurfaceIntersect();
  
  
  // let o1 = new DatumObject3D(CSys.origin().move(new Vector(200, 200, 200)), viewer.sceneSetup);
  // o1.setMoveMode(DatumObject3D.AXIS.Y);
  // cadScene.auxGroup.add(o1);
  // let o2 = new DatumObject3D(CSys.origin().move(new Vector(-200, -200, -200)), viewer.sceneSetup);
  // o2.setMoveMode(DatumObject3D.AXIS.Z);
  // cadScene.auxGroup.add(o2);

  // services.action.run('LOFT');
  // window.voxelTest = voxelTest;
  
  function testOJS() {
    initOpenCascade().then(openCascade => {


      let myWidth = 50, myHeight = 70, myThickness = 30;

      const aPnt1 = new openCascade.gp_Pnt_3(-myWidth / 2., 0, 0);        
      const aPnt2 = new openCascade.gp_Pnt_3(-myWidth / 2., -myThickness / 4., 0);
      const aPnt3 = new openCascade.gp_Pnt_3(0, -myThickness / 2., 0);
      const aPnt4 = new openCascade.gp_Pnt_3(myWidth / 2., -myThickness / 4., 0);
      const aPnt5 = new openCascade.gp_Pnt_3(myWidth / 2., 0, 0);
      
      // Profile : Define the Geometry
      const anArcOfCircle = new openCascade.GC_MakeArcOfCircle_4(aPnt2, aPnt3, aPnt4);
      const aSegment1 = new openCascade.GC_MakeSegment_1(aPnt1, aPnt2);
      const aSegment2 = new openCascade.GC_MakeSegment_1(aPnt4, aPnt5);
      
      // Profile : Define the Topology
      const anEdge1 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(aSegment1.Value().get()));
      const anEdge2 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(anArcOfCircle.Value().get()));
      const anEdge3 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(aSegment2.Value().get()));
      const aWire  = new openCascade.BRepBuilderAPI_MakeWire_4(anEdge1.Edge(), anEdge2.Edge(), anEdge3.Edge());
      
      // Complete Profile
      const xAxis = openCascade.gp.OX();
      const aTrsf = new openCascade.gp_Trsf_1();
      
      aTrsf.SetMirror_2(xAxis);
      const aBRepTrsf = new openCascade.BRepBuilderAPI_Transform_2(aWire.Wire(), aTrsf, false);
      const aMirroredShape = aBRepTrsf.Shape();
      
      const mkWire = new openCascade.BRepBuilderAPI_MakeWire_1();
      mkWire.Add_2(aWire.Wire());
      mkWire.Add_2(openCascade.TopoDS.Wire_1(aMirroredShape));
      const myWireProfile = mkWire.Wire();
      
      // Body : Prism the Profile
      const myFaceProfile = new openCascade.BRepBuilderAPI_MakeFace_15(myWireProfile, false);
      const aPrismVec = new openCascade.gp_Vec_4(0, 0, myHeight);
      let myBody = new openCascade.BRepPrimAPI_MakePrism_1(myFaceProfile.Face(), aPrismVec, false, true);
      
      // Body : Apply Fillets
      const mkFillet = new openCascade.BRepFilletAPI_MakeFillet(myBody.Shape(), openCascade.ChFi3d_FilletShape.ChFi3d_Rational);
      const anEdgeExplorer = new openCascade.TopExp_Explorer_2(myBody.Shape(), openCascade.TopAbs_ShapeEnum.TopAbs_EDGE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE);
      while(anEdgeExplorer.More()) {
        const anEdge = openCascade.TopoDS.Edge_1(anEdgeExplorer.Current());
        // Add edge to fillet algorithm
        mkFillet.Add_2(myThickness / 12., anEdge);
        anEdgeExplorer.Next();
      }
      myBody = mkFillet.Shape();
      
      // Body : Add the Neck
      const neckLocation = new openCascade.gp_Pnt_3(0, 0, myHeight);
      const neckAxis = openCascade.gp.DZ();
      const neckAx2 = new openCascade.gp_Ax2_3(neckLocation, neckAxis);
      
      const myNeckRadius = myThickness / 4.;
      const myNeckHeight = myHeight / 10.;
      
      const MKCylinder = new openCascade.BRepPrimAPI_MakeCylinder_3(neckAx2, myNeckRadius, myNeckHeight);
      const myNeck = MKCylinder.Shape();
      
      myBody = new openCascade.BRepAlgoAPI_Fuse_3(myBody, myNeck);
      
      // Body : Create a Hollowed Solid
      let faceToRemove;
      let zMax = -1;
      const aFaceExplorer = new openCascade.TopExp_Explorer_2(myBody.Shape(), openCascade.TopAbs_ShapeEnum.TopAbs_FACE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE);
      for(; aFaceExplorer.More(); aFaceExplorer.Next()) {
        const aFace = openCascade.TopoDS.Face_1(aFaceExplorer.Current());
        // Check if <aFace> is the top face of the bottle's neck 
        const aSurface = openCascade.BRep_Tool.Surface_2(aFace);
        if(aSurface.get().$$.ptrType.name === "Geom_Plane*") {
          const aPlane = new openCascade.Handle_Geom_Plane_2(aSurface.get()).get();
          const aPnt = aPlane.Location();
          const aZ = aPnt.Z();
          if(aZ > zMax) {
            zMax = aZ;
            faceToRemove = new openCascade.TopExp_Explorer_2(aFace, openCascade.TopAbs_ShapeEnum.TopAbs_FACE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE).Current();
          }
        }
      }
      
      const facesToRemove = new openCascade.TopTools_ListOfShape_1();
      facesToRemove.Append_1(faceToRemove);
      const s = myBody.Shape();
      myBody = new openCascade.BRepOffsetAPI_MakeThickSolid_1();
      myBody.MakeThickSolidByJoin(s, facesToRemove, -myThickness / 50, 1.e-3, openCascade.BRepOffset_Mode.BRepOffset_Skin, false, false, openCascade.GeomAbs_JoinType.GeomAbs_Arc, false);
      // Threading : Create Surfaces
      const aCyl1 = new openCascade.Geom_CylindricalSurface_1(new openCascade.gp_Ax3_2(neckAx2), myNeckRadius * 0.99);
      const aCyl2 = new openCascade.Geom_CylindricalSurface_1(new openCascade.gp_Ax3_2(neckAx2), myNeckRadius * 1.05);
      
      // Threading : Define 2D Curves
      const aPnt = new openCascade.gp_Pnt2d_3(2. * Math.PI, myNeckHeight / 2.);
      const aDir = new openCascade.gp_Dir2d_4(2. * Math.PI, myNeckHeight / 4.);
      const anAx2d = new openCascade.gp_Ax2d_2(aPnt, aDir);
      
      const aMajor = 2. * Math.PI;
      const aMinor = myNeckHeight / 10;
      
      const anEllipse1 = new openCascade.Geom2d_Ellipse_2(anAx2d, aMajor, aMinor, true);
      const anEllipse2 = new openCascade.Geom2d_Ellipse_2(anAx2d, aMajor, aMinor / 4, true);
      const anArc1 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve_2(anEllipse1), 0, Math.PI, true, true);
      const anArc2 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve_2(anEllipse2), 0, Math.PI, true, true);
      const tmp1 = anEllipse1.Value(0);
      const anEllipsePnt1 = new openCascade.gp_Pnt2d_3(tmp1.X(), tmp1.Y());
      const tmp2 = anEllipse1.Value(Math.PI);
      const anEllipsePnt2 = new openCascade.gp_Pnt2d_3(tmp2.X(), tmp2.Y());
      
      const aSegment = new openCascade.GCE2d_MakeSegment_1(anEllipsePnt1, anEllipsePnt2);
      // Threading : Build Edges and Wires
      const anEdge1OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(anArc1), new openCascade.Handle_Geom_Surface_2(aCyl1));
      const anEdge2OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(aSegment.Value().get()), new openCascade.Handle_Geom_Surface_2(aCyl1));
      const anEdge1OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(anArc2), new openCascade.Handle_Geom_Surface_2(aCyl2));
      const anEdge2OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(aSegment.Value().get()), new openCascade.Handle_Geom_Surface_2(aCyl2));
      const threadingWire1 = new openCascade.BRepBuilderAPI_MakeWire_3(anEdge1OnSurf1.Edge(), anEdge2OnSurf1.Edge());
      const threadingWire2 = new openCascade.BRepBuilderAPI_MakeWire_3(anEdge1OnSurf2.Edge(), anEdge2OnSurf2.Edge());
      openCascade.BRepLib.BuildCurves3d_2(threadingWire1.Wire());
      openCascade.BRepLib.BuildCurves3d_2(threadingWire2.Wire());
      openCascade.BRepLib.BuildCurves3d_2(threadingWire1.Wire());
      openCascade.BRepLib.BuildCurves3d_2(threadingWire2.Wire());
      
      // Create Threading 
      const aTool = new openCascade.BRepOffsetAPI_ThruSections(true, false, 1.0e-06);
      aTool.AddWire(threadingWire1.Wire());
      aTool.AddWire(threadingWire2.Wire());
      aTool.CheckCompatibility(false);
      
      const myThreading = aTool.Shape();
      
      // Building the Resulting Compound 
      const aRes = new openCascade.TopoDS_Compound();
      const aBuilder = new openCascade.BRep_Builder();
      aBuilder.MakeCompound(aRes);
      aBuilder.Add(aRes, myBody.Shape());
      aBuilder.Add(aRes, myThreading);
      
      const brepdata = interogate(aRes, openCascade);

      const mobject = new MBrepShell( occ2brep(aRes, openCascade) );
      
      services.exposure.addOnScene(mobject);

    });

    function interogate(aShape: any, oc: any) {

      
      new oc.BRepMesh_IncrementalMesh_2(aShape, 3, false, 0.5, false);  

      console.log(oc.TopAbs_ShapeEnum.TopAbs_FACE)
      const aExpFace = new oc.TopExp_Explorer_2(aShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE); 
      const out = {}; 
      const facesOut = [];
      for(;aExpFace.More();aExpFace.Next()) 
      {   
        const faceOut = {};
        const tessOut = [];
        
        const aFace = oc.TopoDS.Face_1(aExpFace.Current());
    
        const aSurface = oc.BRep_Tool.Surface_2(aFace).get();
        aSurface.IsKind = () => false
        let surfaceOut = {};
        if (aSurface.IsKind("Geom_BoundedSurface")) {
          const bSpline = oc.GeomConvert.prototype.SurfaceToBSplineSurface(aSurface).get();
          surfaceOut = {"TYPE": "UNKNOWN"};//surfaceWriteBounded(bSpline);
          //if BRepPrimAPI_MakePrism(,,,canonicalize = true ) then all swept surfaces(walls) are forced to planes if possible
        } else if (aSurface.IsKind("Geom_ElementarySurface")) {
    //        printf("INTER TYPE: Geom_ElementarySurface \n");
          if (aSurface.IsKind("Geom_Plane")) {
            surfaceOut = surfaceWritePlane(aSurface);
          } else {
            surfaceOut = {"TYPE": "UNKNOWN"};
          }
        } else if ( aSurface.IsKind("Geom_SweptSurface")) {
    //        printf("INTER TYPE: Geom_SweptSurface \n");
          surfaceOut = {"TYPE": "SWEPT"};
        } else if ( aSurface.IsKind("Geom_OffsetSurface")) {
    //        printf("INTER TYPE: Geom_OffsetSurface \n");
          surfaceOut = {"TYPE": "OFFSET"};
        } else {
          surfaceOut = {"TYPE": "UNKNOWN"};
        }
        faceOut["surface"] = surfaceOut;
        console.log("string tesselation");
        let aLocation = new oc.TopLoc_Location_1();
        let aTrHandler = oc.BRep_Tool.Triangulation(aFace, aLocation);
        console.log("got triangles");


        if(!aTrHandler.IsNull()) {  
          const aTr = aTrHandler.get();
          const aNodes = aTr.Nodes(); 
    
          const points = [];
          for(let i = 0; i < aNodes.Length(); i++) {
            let p = aNodes.Value(i + 1).Transformed(aLocation.Transformation());
            points.push([p.X(), p.Y(), p.Z()]);
          }
    
          const triangles = aTr.Triangles();  
          const nnn = aTr.NbTriangles(); 
          
          const isPlane = aSurface.IsKind("Geom_Plane");
        
          for( let nt = 1 ; nt < nnn+1 ; nt++) { 
            // takes the node indices of each triangle in n1,n2,n3: 
        
            let t = triangles.Value(nt);

            let n1 = t.Value(1);
            let n2 = t.Value(2);
            let n3 = t.Value(3); 
        
            const aPnt1 = points[n1 - 1]; 
            const aPnt2 = points[n2 - 1]; 
            const aPnt3 = points[n3 - 1]; 
        
            const def = [];
        
            const tr = [];
            tr.push(aPnt1);  
            tr.push(aPnt2);  
            tr.push(aPnt3);
        
            def.push(tr);  
        
            if (!isPlane) {
              // const norms = [];
              // norms.push(dirWrite(computeNormal(aTr->UVNode(n1), aSurface).Transformed(aLocation)));  
              // norms.push(dirWrite(computeNormal(aTr->UVNode(n2), aSurface).Transformed(aLocation)));  
              // norms.push(dirWrite(computeNormal(aTr->UVNode(n3), aSurface).Transformed(aLocation)));
              // def.push(norms);  
            }
            
            tessOut.push(def);
          } 

        }


          //BRepTools::OuterWire(face)  - return outer wire for classification if needed 
          const loopsOut = [];
          // const wires = new oc.TopExp_Explorer_2(aFace, oc.TopAbs_WIRE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
          // while (wires.More()) {
          //   console.log("processing wires");
          //   const wire = oc.TopoDS.prototype.Wire(wires.Current()); 
          //   wires.Next();
          //   const aExpEdge = new oc.BRepTools_WireExplorer(wire);
          //   const edgesOut = [];
          //   while (aExpEdge.More()) {
          //     const aEdge = oc.TopoDS.prototype.Edge(aExpEdge.Current()); 
          //     aExpEdge.Next(); 
              
          //     if(aEdge.IsNull()) {
          //       console.log("edge is null, skipping");
          //       continue;
          //     }
    
          //     const edgeOut = {};//edgeWrite(aEdge);
              // if (!edgeOut.hasKey("a") || !edgeOut.hasKey("b")) {
              //   std::cout << "can't write edge, skipping" << std::endl;
              //   continue;
              // }
            //   const edgeTessOut = Array();
              
            //   Handle(Poly_PolygonOnTriangulation) edgePol = BRep_Tool::PolygonOnTriangulation(aEdge, aTr, aLocation);  
            //   if(!edgePol.IsNull())  {
            //     const TColStd_Array1OfInteger& edgeIndices = edgePol->Nodes(); 
            //     for( Standard_Integer j = 1; j <= edgeIndices.Length(); j++ ) {
            //       gp_Pnt edgePoint = fPoints(edgeIndices(j));
            //       edgeTessOut.append(pntWrite(edgePoint));        
            //     }
            //   } else {
            //     Handle(Poly_PolygonOnTriangulation) pt;
            //     Handle(Poly_Triangulation) edgeTr;
            //     TopLoc_Location edgeLoc;
            //     BRep_Tool::PolygonOnTriangulation(aEdge, pt, edgeTr, edgeLoc);
            //     if(!pt.IsNull())  {
            //       const TColStd_Array1OfInteger& edgeIndices = pt->Nodes(); 
            //       const TColgp_Array1OfPnt& edgeNodes = edgeTr->Nodes(); 
            //       for( Standard_Integer j = 1; j <= edgeIndices.Length(); j++ ) {
            //         gp_Pnt edgePoint = edgeNodes(j).Transformed(edgeLoc);
            //         edgeTessOut.append(pntWrite(edgePoint));        
            //       }
            //     }
            //   }
            //   if (!INTERROGATE_STRUCT_ONLY) {
            //     edgeOut["tess"] = edgeTessOut;
            //   }
            //   TopoDS_Edge* persistEdge = new TopoDS_Edge(aEdge);
    
            //   edgeOut["ptr"] = ((std::uintptr_t)persistEdge);
            //   edgeOut["edgeRef"] = edgeFaceMap.FindIndex(aEdge);
            //   edgesOut.append(edgeOut);  
            // }
            // loopsOut.append(edgesOut);
          // }        
          
          faceOut["loops"] = loopsOut;
          faceOut["inverted"] = aFace.Orientation_1() == oc.TopAbs_Orientation.TopAbs_REVERSED;
          // if (!INTERROGATE_STRUCT_ONLY) {
            faceOut["tess"] = tessOut;
          // }
          // if (model != NULL) {
          //   if (model->hasData(aFace)) {
          //     faceOut["productionInfo"] = model->getData(aFace);
          //   }
          // }
          // TopoDS_Face* persistFace = new TopoDS_Face(aFace);
          // faceOut["ref"] = ((std::uintptr_t)aFace.TShape().get());
          // faceOut["ptr"] = ((std::uintptr_t)persistFace);
          facesOut.push(faceOut);
        
      }  
      out["faces"] = facesOut; 
      return out; 
    }

    function readBrep(data: BrepOutputData) {
    
      let bb = new BrepBuilder();
      let vf = new VertexFactory();
      
      for (let faceData of data.faces) {
        bb.face();
        // @ts-ignore
        let nonDirect = faceData.surface.direct === false; // left handed coordinate system for planes
        let inverted = faceData.inverted !== nonDirect;
        bb._face.data.tessellation = {
          format: 'verbose',
          data: normalizetessellationData(faceData.tess, inverted, faceData.surface.TYPE === 'PLANE' ? faceData.surface.normal : undefined)
        };
        bb._face.data.productionInfo = faceData.productionInfo;
        if (faceData.ref !== undefined) {
          bb._face.data.externals = {
            ref: faceData.ref,
            ptr: faceData.ptr
          }  
        }  
        
        for (let loop of faceData.loops) {
          bb.loop();
          for (let edgeData of loop) {
            let a = vf.getData(edgeData.inverted ? edgeData.b : edgeData.a);
            let b = vf.getData(edgeData.inverted ? edgeData.a : edgeData.b);
            bb.edge(a, b, () => undefined, edgeData.inverted,  edgeData.edgeRef);
            bb.lastHalfEdge.edge.data.tessellation = edgeData.tess;
            //todo: data should provide full externals object
            bb.lastHalfEdge.edge.data.externals = {
              ptr: edgeData.ptr
            };
          }
        }
        // try {
        //   bb._face.surface = readSurface(faceData.surface, faceData.inverted, inverted, bb._face);
        // } catch (e) {
        //   console.error(e);
        //   bb._face.surface = new BrepSurface(new NullSurface());
        // }
        bb._face.surface = new BrepSurface(new NullSurface());
      }
      //todo: data should provide full externals object
      bb._shell.data.externals = {
        ptr: data.ptr
      };
      return bb.build();
    }
    
    
  }

  ctx.streams.lifecycle.projectLoaded.attach(ready => {
    if (ready) {
      // testEdgeSplit(ctx);
      //testVertexMoving(ctx);
      //  test4();
      //testSplitFace();
      //testRemoveFaces();
     //testRemoveVertex();
    //  testRemoveEdge();
    testOJS()
    }
  });

}
