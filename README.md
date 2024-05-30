# GCP Editor Pro ©

Amazingly Fast and Simple Ground Control Points Interface for [OpenDroneMap](https://opendronemap.org) software. [Try it online](https://gcp.uav4geo.com)!

![image](https://user-images.githubusercontent.com/1951843/80494281-7e63dd00-8934-11ea-9176-75e37db5bb97.png)

## Features

- Import GPS measurements from CSV
- Easy/fast image selection
- Create GCPs from scratch by clicking on a map
- Filter and sort images by distance from GCPs
- Automatically detect GCPs in images (experimental, checkerboard patterns only)
- Custom basemap selector
- Geocoder
- Import existing GCP Files
- Offline capable
- Cross platform (Windows, Mac, Linux, Web)
- WebODM Integration (Plugin)

## Installation

The easiest, most convenient way to run the software is to [download the prebuilt releases](https://uav4geo.com/software/gcpeditorpro), which can be downloaded freely for evaluation. 

You will need to [purchase a license](https://uav4geo.com/software/gcpeditorpro#buy) to unlock the prebuild releases after evaluation. Your purchase helps support the development of the software ❤

If you don't want to pay for a license, you can compile the software from sources (see instructions below). If you choose to compile from sources, you are free to use, copy, distribute and modify the software, provided that you are the **only** user of the software. See the terms of the [Fair Source License](https://github.com/uav4geo/GCPEditorPro/blob/master/LICENSE) for details.

## Compile From Sources

The application is written using [Angular](https://angular.io).

You will need to install:
 * [NodeJS](https://nodejs.org/en/)
 
Extract the source code in a directory, then from the directory:

```bash
npm install
ng serve
```
If you have some "Conflicting peer dependency" or other error you can try

```bash
npm install --legacy-peer-deps
export NODE_OPTIONS=--openssl-legacy-provider; ng serve
```


After a while, the application should be available from your browser at http://localhost:4200.

You can build the electron apps and the WebODM plugin by running:

```bash
# Windows
dist.bat

# Linux/Mac
./dist.sh
```

Results will be stored in the `dist/` folder.

You can run `npm run stats` to analyze production bundle size

## Improving on GCPs detection

GCP detection is performed using OpenCV.js with a HAAR cascade classifier ([docs](https://docs.opencv.org/3.4/db/d28/tutorial_cascade_classifier.html), [tutorial](https://medium.com/analytics-vidhya/haar-cascades-explained-38210e57970d), [tutorial](https://stackabuse.com/object-detection-with-opencv-python-using-a-haar-cascade-classifier/), [examples](https://github.com/opencv/opencv/tree/master/data/haarcascades)). The classifier was trained on a small to medium sized dataset of aerial images ([datasets](https://www.opendronemap.org/odm/datasets/)). 

You can use https://amin-ahmadi.com/cascade-trainer-gui/ to train a new classifier or follow [these instructions](https://docs.opencv.org/4.x/dc/d88/tutorial_traincascade.html) to train a new classifier by hand.

The current classifier was trained on:
 - 1391 negatives 
 - 86 positives

With these parameters:
 - 20 stages
 - 0.995 minimal hit rate
 - 0.500 maximal false alarm rate
 - 0.95 weight trim rate
 - 1.00 maximal depth weak tree
 - 100 maximal weak trees

The classifiers folder is `src/assets/opencv/data/haarcascades`. GCPEditorPro supports the use of multiple classifiers applied sequentially. In order to add a new classifier, you need to add the new xml file to the classifiers folder and add the new classifier name to the `classifiers` array in the `src/app/gcps-detector.service.ts` file.

## Contributing

We welcome contributions to improve GCP Editor Pro. If you want to add something, please open a pull request. Please note that the copyright of any contribution will have to be gifted to UAV4GEO because of the [Fair Source License](https://github.com/uav4geo/GCPEditorPro/blob/master/LICENSE).

## Reporting Issues

Please [open an issue](https://github.com/uav4geo/GCPEditorPro/issues) if you find a problem with the software.

## FAQ

### How is the Fair Source License similar to (or different from) open-source licenses?

The Fair Source License is not an open-source license and doesn’t intend to be an open-source license. Fair Source allows usage, redistribution, and modification when the usage is below the Use Limitation. Once an organization exceeds the Use Limitation (which is determined by the licensor), it must pay a license fee to continue doing those things.

### If I modify the source code, can I redistribute my modified version under the MIT License?

No. Your modified version consists of the original software (which is under the Fair Source License) and your modifications, which together constitute a derivative work of the original software. The license does not grant you the right to redistribute under a license like MIT without the Use Limitation.





