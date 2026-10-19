"use client";
import {useLocale} from '../lib/i18n/provider';
export default function SiteFooter(){const {locale}=useLocale(),zh=locale==='zh-Hans';return <footer className="site-footer"><a href="/privacy" target="_blank" rel="noopener noreferrer">{zh?'隐私政策':'Privacy'}</a><a href="/terms" target="_blank" rel="noopener noreferrer">{zh?'使用条款':'Terms of Use'}</a><a href="/contact" target="_blank" rel="noopener noreferrer">{zh?'联系':'Contact'}</a></footer>;}
