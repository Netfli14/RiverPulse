"use client";

import {Component, type ReactNode} from "react";
import {AppLink} from "@/components/app-link";
import type {Language} from "@/lib/riverpulse-i18n";

const copy = {
  RU: {title:"Не удалось открыть раздел", text:"Попробуй открыть его ещё раз или вернись на главную.", retry:"Попробовать снова", home:"На главную"},
  KZ: {title:"Бөлімді ашу мүмкін болмады", text:"Қайта ашып көріңіз немесе басты бетке оралыңыз.", retry:"Қайталап көру", home:"Басты бетке"},
  EN: {title:"This page could not be opened", text:"Try again or return to the home page.", retry:"Try again", home:"Back to home"},
};

export class PageErrorBoundary extends Component<{children:ReactNode;language:Language}, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    const text=copy[this.props.language];
    return <main className="rp-content"><section className="rp-card rp-panel" role="alert"><h1>{text.title}</h1><p>{text.text}</p><div className="rp-actions"><button className="rp-button primary" onClick={()=>this.setState({failed:false})}>{text.retry}</button><AppLink className="rp-button secondary" href="/">{text.home}</AppLink></div></section></main>;
  }
}
