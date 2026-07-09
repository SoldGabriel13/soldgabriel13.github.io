        let cor = 30;
        let W = 1;
        let R = 0;
        const canvas = document.getElementById('mandelbrotCanvas');
        const resolutionInput = document.getElementById('resolution');
        const iterationsInput = document.getElementById('iterations');
        let zoomInput = document.getElementById('zoom');
        const generateButton = document.getElementById('generate');
        const ctx = canvas.getContext('2d');

        let offsetX = document.getElementById('xc');
        let offsetY = document.getElementById('yc');
        
        function CWhite() {
            cor = 0;
            W = 0;
            R = 0;
        }
        function CRed() {
            cor = 0;
            W = 1;
            R = 0;
        }
        function COrange() {
            cor = 30;
            W = 1;
            R = 0;
        }
        function CYellow() {
            cor = 60;
            W = 1;
            R = 0;
        }
        function CGreen() {
            cor = 120;
            W = 1;
            R = 0;
        }
        function CBlue() {
            cor = 240;
            W = 1;
            R = 0;
        }
        function CDye() {
            cor = 0;
            W = 1;
            R = 1;
        }
        document.getElementById('white').addEventListener('click', CWhite);
        document.getElementById('red').addEventListener('click', CRed);
        document.getElementById('orange').addEventListener('click', COrange);
        document.getElementById('yellow').addEventListener('click', CYellow);
        document.getElementById('green').addEventListener('click', CGreen);
        document.getElementById('blue').addEventListener('click', CBlue);
        document.getElementById('dye').addEventListener('click', CDye);
        
        function next(previous, c) {
            return {
                re: previous.re ** 2 - previous.im ** 2 + c.re,
                im: 2 * previous.re * previous.im + c.im
            };
        }

        function zn(z0, c, maxIter) {
            let z = z0;
            for (let n = 0; n < maxIter; n++) {
                z = next(z, c);
                if (z.re * z.re + z.im * z.im > 4) return n;
            }
            return maxIter;
        }

        function corrigirCoord(px, py, width, height, zoom, xo, yo) {
            const xOffset = parseFloat(offsetX.value);
            const yOffset = parseFloat(offsetY.value);
            return {
                re: (px - width / 2) * (4 / (zoom * width)) + xOffset,
                im: (py - height / 2) * (4 / (zoom * height)) + yOffset
            };
        }


        function hsvToRgb(h, s, v) {
            let c = v * s;
            let x = c * (1 - Math.abs((h / 60) % 2 - 1));
            let m = v - c;
            let r, g, b;
            if (h < 60) [r, g, b] = [c, x, 0];
            else if (h < 120) [r, g, b] = [x, c, 0];
            else if (h < 180) [r, g, b] = [0, c, x];
            else if (h < 240) [r, g, b] = [0, x, c];
            else if (h < 300) [r, g, b] = [x, 0, c];
            else [r, g, b] = [c, 0, x];
            return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map(Math.floor);
        }
        function mod(a1, b1) {
            return ((a1 % b1) + b1) % b1; // Garante o valor positivo
        }

        function drawMandelbrot(width, height, maxIter, zoom) {
            canvas.width = width;
            canvas.height = height;
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;

            const startTime = performance.now();

            for (let px = 0; px < width; px++) {
                for (let py = 0; py < height; py++) {
                    const coord = corrigirCoord(px, py, width, height, zoom);
                    const iter = zn({ re: 0, im: 0 }, coord, maxIter);

                    const color = iter === maxIter
                        ? [0, 0, 0] // Black for points in the set
                        : hsvToRgb((cor * Math.abs(R-1)) + mod(R * iter, 360), Math.min(1, 1* W * (3600 * (maxIter - iter)) / (360 * maxIter)), R*1 + Math.abs(R-1) * Math.min(1, 3 * (360 - (360 * (maxIter - iter)) / maxIter) / 360));

                    const index = 4 * (py * width + px);
                    data[index] = color[0];     // Red
                    data[index + 1] = color[1]; // Green
                    data[index + 2] = color[2]; // Blue
                    data[index + 3] = 255;      // Alpha
                }
            }

            ctx.putImageData(imageData, 0, 0);

            const endTime = performance.now();
            const renderTime = ((endTime - startTime) / 1000).toFixed(2);
            document.getElementById('generate').textContent = `Render Time: ${renderTime} seconds`;
        }

        generateButton.addEventListener('click', () => {
            const resolution = parseInt(resolutionInput.value);
            const iterations = parseInt(iterationsInput.value);
            const zoom = parseFloat(zoomInput.value);
            drawMandelbrot(resolution, resolution, iterations, zoom);
        });
        canvas.addEventListener('mousedown', function(event) {
            const resolution = parseInt(resolutionInput.value);
            const iterations = parseInt(iterationsInput.value);
            const rect = canvas.getBoundingClientRect();
            const xOffset = parseFloat(offsetX.value);
            const yOffset = parseFloat(offsetY.value);
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let zoom = parseFloat(zoomInput.value);
            if (event.button == 0) {
                wha = zoomInput.value = zoom*3;
            }
            if (event.button == 1) {
                event.preventDefault();
                wha = zoomInput.value = zoom/3;
            }

            let a = corrigirCoord(x, y, resolution, resolution, wha);
            offsetX.value = a.re;
            offsetY.value = a.im;
            drawMandelbrot(resolution, resolution, iterations, wha);
            //alert(`${a.re}+i${a.im}`)

        });