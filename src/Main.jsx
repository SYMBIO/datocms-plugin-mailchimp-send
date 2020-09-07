import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Cookie from 'js-cookie';

import connectToDatoCms from './connectToDatoCms';
import './style.sass';

@connectToDatoCms((plugin) => ({
    itemId: plugin.itemId,
    fieldValue: plugin.getFieldValue(plugin.fieldPath),
    getFieldValue: plugin.getFieldValue,
    setFieldValue: (value) => plugin.setFieldValue(plugin.fieldPath, value),
    saveCurrentItem: plugin.saveCurrentItem,
    notice: plugin.notice,
    alert: plugin.alert,
    locale: plugin.locale,
}))
export default class Main extends Component {
    constructor(props) {
        super(props);
        const fieldValue = JSON.parse(props.fieldValue);
        this.state = {
            sendingTest: false,
            test_emails: (fieldValue && fieldValue.test_emails) || '',
            segment:
                (fieldValue &&
                    fieldValue.campaign &&
                    fieldValue.campaign.recipients &&
                    fieldValue.campaign.recipients.segment_opts &&
                    String(fieldValue.campaign.recipients.segment_opts.saved_segment_id)) ||
                '',
            campaign: (fieldValue && fieldValue.campaign) || null,
        };
    }

    componentDidMount() {
        const { campaign } = this.state;

        if (campaign && campaign.status === 'schedule') {
            window.setTimeout(() => {
                this.updateCampaignInfo();
            }, 3000);
        }

        if (campaign && campaign.status === 'sending') {
            window.setTimeout(() => {
                this.updateCampaignInfo();
            }, 3000);
        }
    }

    async sendTest() {
        const {
            itemId, getFieldValue, setFieldValue, saveCurrentItem, locale, notice, alert,
        } = this.props;

        this.setState({
            sendingTest: true,
        });

        try {
            const response = await fetch('http://localhost:3000/api/newsletter/sendTest', {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...this.state,
                    data: {
                        id: itemId,
                        title: getFieldValue(`title.${locale}`),
                        slug: getFieldValue(`slug.${locale}`),
                        perex: getFieldValue(`perex.${locale}`),
                        image: getFieldValue('image').upload_id,
                        date: getFieldValue('date_from'),
                    },
                }),
            });
            const json = await response.json();
            this.setState(
                {
                    sendingTest: false,
                    campaign: json.campaign,
                },
                () => {
                    setFieldValue(JSON.stringify(this.state));
                    saveCurrentItem();
                    notice('Aktualita byla poslána na zadané testovací e-maily');
                },
            );
        } catch (e) {
            this.setState(
                {
                    sendingTest: false,
                },
                () => {
                    alert('Aktualitu se npodařilo odeslat na zadané testovací e-maily');
                },
            );
        }
    }

    async send() {
        const { itemId, getFieldValue, locale } = this.props;
        const response = await fetch('http://localhost:3000/api/newsletter/sendNews', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...this.state,
                data: {
                    id: itemId,
                    title: getFieldValue(`title.${locale}`),
                    slug: getFieldValue(`slug.${locale}`),
                    perex: getFieldValue(`perex.${locale}`),
                    image: getFieldValue('image'),
                    date: getFieldValue('date_from'),
                },
            }),
        });
        const json = await response.json();
        this.setState(
            {
                campaign: json.campaign,
            },
            () => {
                this.updateCampaignInfo();
            },
        );
    }

    async updateCampaignInfo() {
        const { setFieldValue, saveCurrentItem } = this.props;
        // eslint-disable-next-line react/destructuring-assignment
        const fieldValue = JSON.parse(this.props.fieldValue);
        const response = await fetch(`http://localhost:3000/api/newsletter/getCampaign?id=${fieldValue.campaign.id}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
        });
        const json = await response.json();
        this.setState(
            {
                campaign: json.campaign,
            },
            () => {
                setFieldValue(JSON.stringify(this.state));
                saveCurrentItem();
                if (json.campaign && json.campaign.status === 'schedule') {
                    window.setTimeout(() => {
                        this.updateCampaignInfo();
                    }, 3000);
                }

                if (json.campaign && json.campaign.status === 'sending') {
                    window.setTimeout(() => {
                        this.updateCampaignInfo();
                    }, 3000);
                }
            },
        );
    }

    renderInfo() {
        const { campaign } = this.state;
        if (!campaign) {
            return <></>;
        }

        switch (campaign.status) {
            case 'paused':
                return (
                    <div className="info">
                        Rozesílání pozastaveno
                        {' '}
                        <button type="button" className="DatoCMS-button" onClick={() => this.updateCampaignInfo()}>
                            Aktualizovat statistiky
                        </button>
                    </div>
                );
            case 'schedule':
                return (
                    <div className="info">
                        Rozeslání naplánováno
                        {' '}
                        <button type="button" className="DatoCMS-button" onClick={() => this.updateCampaignInfo()}>
                            Aktualizovat statistiky
                        </button>
                    </div>
                );
            case 'sending':
                return (
                    <div className="info">
                        Právě se rozesílá
                        <div className="info">
                            <table className="stats">
                                <tbody>
                                    <tr>
                                        <th>Odeslaných:</th>
                                        <td>{campaign.emails_sent}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <button type="button" className="DatoCMS-button" onClick={() => this.updateCampaignInfo()}>
                                Aktualizovat statistiky
                            </button>
                        </div>
                    </div>
                );
            case 'sent':
                return (
                    <div className="info">
                        <table className="stats">
                            <tbody>
                                <tr>
                                    <th>Čas odeslání:</th>
                                    <td>
                                        {new Date(campaign.send_time).toLocaleDateString('cs')}
                                        {' '}
                                        {new Date(campaign.send_time).toLocaleTimeString('cs')}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Odeslaných:</th>
                                    <td>{campaign.emails_sent}</td>
                                </tr>
                                <tr>
                                    <th>Otevřených:</th>
                                    <td>{campaign.report_summary.unique_opens}</td>
                                </tr>
                                <tr>
                                    <th>Míra otevření:</th>
                                    <td>
                                        {Math.round(campaign.report_summary.open_rate * 10000) / 100}
                                        {' '}
                                        %
                                    </td>
                                </tr>
                                <tr>
                                    <th>Kliknulo:</th>
                                    <td>
                                        {campaign.report_summary.subscriber_clicks}
                                        x
                                    </td>
                                </tr>
                                <tr>
                                    <th>Míra prokliku:</th>
                                    <td>
                                        {Math.round(campaign.report_summary.click_rate * 10000) / 100}
                                        {' '}
                                        %
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <button type="button" className="DatoCMS-button" onClick={() => this.updateCampaignInfo()}>
                            Aktualizovat statistiky
                        </button>
                    </div>
                );
            case 'save':
            default:
                return <></>;
        }
    }

    renderControls() {
        const { setFieldValue, saveCurrentItem } = this.props;
        const {
            test_emails, segment, campaign, sendingTest,
        } = this.state;

        if (campaign && campaign.status !== 'save') {
            return <></>;
        }

        return (
            <div className="controls">
                <div className="content">
                    <div className="content-header">
                        <span>Test</span>
                    </div>
                    <div className="content-content">
                        <label htmlFor="test_emails">
                            Testovací adresy:
                            <input
                                type="text"
                                id="test_emails"
                                name="test_emails"
                                value={test_emails}
                                placeholder="např. test@test.cz,test2@test.cz"
                                onChange={(e) => {
                                    this.setState({ test_emails: e.target.value });
                                    Cookie.set('test_emails', e.target.value, { expires: 10000 });
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            className="DatoCMS-button"
                            onClick={() => this.sendTest()}
                            disabled={sendingTest}
                        >
                            Odeslat na testovací adresy
                        </button>
                    </div>
                </div>
                <div className="content">
                    <div className="content-header">
                        <span>Ostré rozeslání</span>
                    </div>
                    <div className="content-content">
                        <label htmlFor="segment">
                            Seznam příjemců:
                            <br />
                            <select
                                id="segment"
                                name="segment"
                                className="select"
                                value={segment}
                                onChange={(e) => {
                                    this.setState({ segment: e.target.value });
                                    setFieldValue(JSON.stringify(this.state));
                                    saveCurrentItem();
                                }}
                            >
                                <option value="">-</option>
                                <option value="762906">Odborníci</option>
                                <option value="762902">Veřejnost</option>
                                <option value="763598">TEST</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            className="DatoCMS-button DatoCMS-button--alert"
                            onClick={() => this.send()}
                        >
                            Odeslat na vybraný seznam
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className="container">
                {this.renderInfo()}
                {this.renderControls()}
            </div>
        );
    }
}

Main.propTypes = {
    itemId: PropTypes.string,
    fieldValue: PropTypes.string,
    getFieldValue: PropTypes.func,
    setFieldValue: PropTypes.func,
    saveCurrentItem: PropTypes.func,
    notice: PropTypes.func,
    alert: PropTypes.func,
    locale: PropTypes.string,
};
