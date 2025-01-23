import React from 'react';
import { render } from 'react-dom';

import Main from './Main';

try {
    window.DatoCmsPlugin.init((plugin) => {
        plugin.startAutoResizer();

        const container = document.createElement('div');
        document.body.appendChild(container);

        render(<Main plugin={plugin} />, container);
    });
} catch (e) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<span>Not in DatoCMS!</span>, container);
}
